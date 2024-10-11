const { db } = require("../../connectors/dbconnect");
const { procesaCRUD, formatDateDB } = require("../../helpers/procesaCRUD");
const moment = require("moment");

const collection = "rol";
const campoCollection = "rol";
const formatDate = "YYYY-MM-DD HH:mm:ss";
//CREATE O INSERT
exports.nuevoRegistro = async (req, res) => {
  try {
    const jsonInitialC = {
      rol: req.body.rol.toUpperCase(),
      descripcion: req.body.descripcion,
      fechaCreacion: moment(),
      usuarioCrea: req.usuario.usuario,
      estado: "A",
    };

    // Filtrar los campos vacíos o nulos
    const jsonInsert = Object.entries(jsonInitialC).reduce(
      (acc, [key, value]) => {
        if (
          value?.toString() &&
          value?.toString() != "" &&
          value?.toString() != "undefined"
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    // Crear un nuevo documento en la colección 'roles'
    const docRef = await db.collection(collection).add(jsonInsert);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${jsonInsert[campoCollection]} creado exitosamente`,
      id: docRef.id, // Devolver el ID del documento creado
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//READ OR CONSULT
exports.consultarRegistros = async (req, res) => {
  try {
    let { filtro } = req.params;
    let textoFiltro = filtro;

    let dbConsulta = [{}];
    let filas = [];
    let columnas = [];

    if (filtro) {
      filtro = filtro ? filtro.split("") : [];

      dbConsulta = await db
        .collection(collection)
        .where("estado", "in", filtro)
        .get();

      //Retorna el nuevo json que se pintara en la tabla
      filas = dbConsulta?.docs.map((data) => {
        const element = data.data();
        let fila = {
          ID: data.id,
          CODIGO: element.rol,
          DESCRIPCION: element.descripcion,
          USUARIO_CREACION: element.usuarioCrea,
          FECHA_CREACION: formatDateDB(element.fechaCreacion, formatDate),
          ESTADO: element.estado == "A" ? "Activo" : "Eliminado",
        };

        if (textoFiltro.includes("N")) {
          fila = {
            ...fila,
            USUARIO_ELIMINO: element.usuarioElimina,
            FECHA_ELIMINACION: formatDateDB(
              element.fechaEliminacion,
              formatDate
            ),
          };
        }

        return fila;
      });
    }

    //Retornar filas vacias para armar las columnas
    if (dbConsulta.empty) {
      filas = [
        {
          ID: "",
          CODIGO: "",
          DESCRIPCION: "",
        },
      ];
    }

    columnas = Object.keys(filas[0])
      .filter((key) => key !== "ID")
      .map((key) => ({
        accessorKey: key, //Debe hacer match con la propiedad de data
        header: key.replace(/_/g, " "), //Titulo para la columna se extrae de la propiedad data
        size: 20,
      }));

    if (dbConsulta.empty) {
      filas = [];
    }

    const CRUD = await procesaCRUD(CRUDs);
    const json = {
      tabla: {
        data: filas,
        columnas: columnas,
      },
      CRUD,
    };

    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosamente",
      respuesta: json,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//UPDATE OR MODIFY
exports.modificarRegistro = async (req, res) => {
  try {
    const { id } = req.body;
    const dbModifica = await db.collection(collection).doc(id).get();
    if (!dbModifica.exists || dbModifica.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado o no disponible para modificación`,
      });
    }

    const jsonInitial = {
      descripcion: req.body.descripcion,
      fechaModificacion: moment(),
    };

    // Filtrar los campos vacíos o nulos
    const jsonUpdate = Object.entries(jsonInitial).reduce(
      (acc, [key, value]) => {
        if (
          value?.toString() &&
          value?.toString() != "" &&
          value?.toString() != "undefined"
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    // Actualizar el documento
    await dbModifica.ref.update(jsonUpdate);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${
        dbModifica.data()[campoCollection]
      } modificado exitosamente`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//DELETE OR ELIMINATE
exports.eliminarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const dbElimina = await db.collection(collection).doc(id).get();
    if (!dbElimina.exists || dbElimina.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado o no disponible para modificación`,
      });
    }

    const jsonDelete = {
      estado: "N",
      fechaEliminacion: moment(),
      usuarioElimina: req.usuario.usuario,
    };

    //Eliminar Registro
    await dbElimina.ref.update(jsonDelete);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${
        dbElimina.data()[campoCollection]
      } eliminado exitosamente`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//READ OR CONSULT ONE
exports.consultaRegistroID = async (req, res) => {
  try {
    let { id } = req.params;

    const dbConsultaID = await db.collection(collection).doc(id).get();
    if (!dbConsultaID.exists || dbConsultaID.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbConsultaIDData = dbConsultaID.data();
    // Armado de la respuesta
    const json = {
      id: dbConsultaID.id,
      rol: dbConsultaIDData.rol,
      descripcion: dbConsultaIDData.descripcion,
    };

    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosa",
      respuesta: json,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

const CRUDs = [
  {
    elemento: "input",
    type: "text",
    name: "rol",
    id_input: "rol",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: true,
    titulo: "Rol",
    tamanio: 15,
    obligatorio: true,
    placeholder: "Ingrese nombre del Rol",
    className: "col-md-9",
    CRUD: {
      create: {
        disabled: false,
      },
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "descripcion",
    id_input: "descripcion",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Descripcion",
    tamanio: 200,
    obligatorio: true,
    placeholder: "Ingrese descripcion del rol",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea eliminar el rol",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      delete: {},
    },
  },
];
