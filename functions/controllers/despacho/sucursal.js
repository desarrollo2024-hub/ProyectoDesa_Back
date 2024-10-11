const { db } = require("../../connectors/dbconnect");
const { procesaCRUD, formatDateDB } = require("../../helpers/procesaCRUD");
const moment = require("moment");

const collection = "sucursal";
const campoCollection = "nombre";
const formatDate = "YYYY-MM-DD HH:mm:ss";

//CREATE O INSERT
exports.nuevoRegistro = async (req, res) => {
  try {
    const jsonInsert = {
      nombre: req.body.nombre,
      direccion: req.body.direccion,
      fechaCreacion: moment(),
      usuarioCrea: req.usuario.usuario,
      estado: "A",
    };

    const dbInserta = await db.collection(collection).add(jsonInsert);
    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${jsonInsert[campoCollection]} creado exitosamente`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
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
          NOMBRE: element.nombre,
          DIRECCION: element.direccion || "",
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
          NOMBRE: "",
          DIRECCION: "",
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
    const dbModifica = db.collection(collection).doc(id);
    const dbModificaVal = await dbModifica.get();

    if (!dbModificaVal.exists) {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbModificaData = dbModificaVal.data();
    if (dbModificaData.estado === "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const jsonInitial = {
      direccion: req.body.direccion,
      fechaModificacion: moment(),
    };

    // Filtrar los campos vacíos o nulos
    const jsonUpdate = Object.entries(jsonInitial).reduce(
      (acc, [key, value]) => {
        if (value?.toString() && value?.toString() != "") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    await dbModifica.update(jsonUpdate);
    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${dbModificaData[campoCollection]} modificado exitosamente`,
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
    const dbElimina = db.collection(collection).doc(id);
    const dbEliminaVal = await dbElimina.get();

    if (!dbEliminaVal.exists) {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbElliminaData = dbEliminaVal.data();

    // Verificar si el estado es diferente de "N"
    if (dbElliminaData.estado === "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const jsonDelete = {
      estado: "N",
      fechaEliminacion: moment(),
      usuarioElimina: req.usuario.usuario,
    };

    //Eliminar Registro
    await dbElimina.update(jsonDelete);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${dbElliminaData[campoCollection]} eliminado exitosamente`,
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
exports.consultarRegPorID = async (req, res) => {
  try {
    let { id } = req.params;
    const dbConsultaID = await db.collection(collection).doc(id).get();
    if (!dbConsultaID.exists) {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbConsultaIDData = dbConsultaID.data();
    // Verificar si el estado es "A"
    if (dbConsultaIDData.estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    //Armado de filas (data) y columnas para pintar tabla
    const json = {
      id: dbConsultaID.id,
      nombre: dbConsultaIDData.nombre,
      direccion: dbConsultaIDData.direccion,
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

const CRUDs = [
  {
    elemento: "input",
    type: "text",
    name: "nombre",
    id_input: "nombre",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: true,
    titulo: "Nombre",
    tamanio: 100,
    obligatorio: true,
    placeholder: "Ingrese nombre de la sucursal",
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
    name: "direccion",
    id_input: "direccion",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Dirección",
    tamanio: 200,
    obligatorio: true,
    placeholder: "Ingrese dirección de la sucursal",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea eliminar la sucursal",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      delete: {},
    },
  },
];
