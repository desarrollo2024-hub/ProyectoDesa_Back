const { db } = require("../../connectors/dbconnect");
const { procesaCRUD, formatDateDB } = require("../../helpers/procesaCRUD");
const moment = require("moment");

const collection = "importacionEnc";
const campoCollection = "bl";
const formatDate = "YYYY-MM-DD HH:mm:ss";
const formatDateConsul = "YYYY-MM-DD";

//CREATE O INSERT
exports.nuevoRegistro = async (req, res) => {
  try {
    const jsonInsert = {
      bl: req.body.bl,
      embarcador: req.body.embarcador,
      consignatario: req.body.consignatario,
      fechaSalida: moment(req.body.fechaSalida).startOf("day").toDate(),
      contenedor: req.body.contenedor,
      barco: req.body.barco,
      puertoOrigen: req.body.puertoOrigen,
      puertoDestino: req.body.puertoDestino,
      fechaArribo: moment(req.body.fechaArribo).startOf("day").toDate(),
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
          BL: element.bl || "",
          EMBARCADOR: element.embarcador || "",
          CONSIGNATARIO: element.consignatario || "",
          FECHA_SALIDA: formatDateDB(element.fechaSalida, formatDateConsul),
          CONTENEDOR: element.contenedor || "",
          BARCO: element.barco || "",
          PUERTO_ORIGEN: element.puertoOrigen || "",
          PUETO_DESTINO: element.puertoDestino || "",
          FECHA_ARRIBO: formatDateDB(element.fechaSalida, formatDateConsul),
          USUARIO_CREACION: element.usuarioCrea || "",
          FECHA_CREACION: formatDateDB(element.fechaCreacion, formatDate),
          ESTADO:
            element.estado == "A"
              ? "Activo"
              : element.estado == "F"
              ? "Finalizado"
              : "Eliminado",
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

        if (textoFiltro.includes("F")) {
          fila = {
            ...fila,
            USUARIO_FINALIZA: element.usuarioFinaliza,
            FECHA_FINALIZA: formatDateDB(element.fechaFinaliza, formatDate),
          };
        }

        return fila;
      });
    }

    //Retornar filas vacias para armar las columnas
    if (dbConsulta.empty) {
      filas = [
        {
          BL: "",
          EMBARCADOR: "",
          CONSIGNATARIO: "",
          FECHA_SALIDA: "",
          CONTENEDOR: "",
          BARCO: "",
          PUERTO_ORIGEN: "",
          PUETO_DESTINO: "",
          FECHA_ARRIBO: "",
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

    //SECCIÓN DE SELECTS
    let valSelect = {};

    const dbPuertosSnap = await db
      .collection("puerto")
      .where("estado", "!=", "N")
      .get();

    const dbPuertos = dbPuertosSnap.docs.map((doc) => ({
      id: doc.data().nombre,
      nombre: doc.data().nombre,
    }));

    // Obtener condiciones
    valSelect = {
      Puerto: dbPuertos || [],
    };

    const json = {
      tabla: {
        data: filas,
        columnas: columnas,
      },
      CRUD,
      valSelect,
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
      embarcador: req.body.embarcador,
      consignatario: req.body.consignatario,
      fechaSalida: moment(req.body.fechaSalida).startOf("day").toDate(),
      contenedor: req.body.contenedor,
      barco: req.body.barco,
      puertoOrigen: req.body.puertoOrigen,
      puertoDestino: req.body.puertoDestino,
      fechaArribo: moment(req.body.fechaArribo).startOf("day").toDate(),
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
      bl: dbConsultaIDData.bl,
      embarcador: dbConsultaIDData.embarcador,
      consignatario: dbConsultaIDData.consignatario,
      fechaSalida: formatDateDB(dbConsultaIDData.fechaSalida, formatDateConsul),
      contenedor: dbConsultaIDData.contenedor,
      barco: dbConsultaIDData.barco,
      puertoOrigen: dbConsultaIDData.puertoOrigen,
      puertoDestino: dbConsultaIDData.puertoDestino,
      fechaArribo: formatDateDB(dbConsultaIDData.fechaArribo, formatDateConsul),
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

//CAMBIO DE ETAPA
exports.cambiarEtapa = async (req, res) => {
  try {
    const { id } = req.params;
    const dbFinaliza = db.collection(collection).doc(id);
    const dbFinalizaVal = await dbFinaliza.get();

    if (!dbFinalizaVal.exists) {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbFinalizaData = dbFinalizaVal.data();

    // Verificar si el estado es diferente de "N"
    if (dbFinalizaData.estado === "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const jsonFinaliza = {
      estado: "F",
      fechaFinaliza: moment(),
      usuarioFinaliza: req.usuario.usuario,
    };

    //Eliminar Registro
    await dbFinaliza.update(jsonFinaliza);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${dbFinalizaData[campoCollection]} finalizado exitosamente`,
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
    name: "bl",
    id_input: "bl",
    classNameLabel: "col-sm-2 col-form-label",
    disabled: true,
    titulo: "BL",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Ingrese el BL",
    className: "col-md-4",
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
    type: "date",
    name: "fechaSalida",
    id_input: "fechaSalida",
    classNameLabel: "col-sm-2 col-form-label",
    disabled: false,
    titulo: "Fecha Salida",
    tamanio: 10,
    obligatorio: true,
    placeholder: "Ingrese la fecha",
    className: "col-md-4",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "embarcador",
    id_input: "embarcador",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Embarcador",
    tamanio: 50,
    obligatorio: true,
    placeholder: "Ingrese el embarcador",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "consignatario",
    id_input: "consignatario",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Consignatario",
    tamanio: 100,
    obligatorio: true,
    placeholder: "Ingrese el consignatario",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "contenedor",
    id_input: "contenedor",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Contenedor",
    tamanio: 15,
    obligatorio: true,
    placeholder: "Ingrese el contenedor",
    className: "col-md-3",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "barco",
    id_input: "barco",
    classNameLabel: "col-sm-2 col-form-label",
    disabled: false,
    titulo: "Barco",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Ingrese el barco",
    className: "col-md-4",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "select",
    type: "select",
    name: "puertoOrigen",
    id_input: "puertoOrigen",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Puerto origen",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Seleccione el puerto origen",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "select",
    type: "select",
    name: "puertoDestino",
    id_input: "puertoDestino",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Puerto destino",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Seleccione el puerto destino",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "input",
    type: "date",
    name: "fechaArribo",
    id_input: "fechaArribo",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Fecha Arribo",
    tamanio: 10,
    obligatorio: true,
    placeholder: "Ingrese la fecha arribo",
    className: "col-md-3",
    CRUD: {
      create: {},
      read: { disabled: true },
      update: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea eliminar la importación",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      delete: {},
    },
  },
];
