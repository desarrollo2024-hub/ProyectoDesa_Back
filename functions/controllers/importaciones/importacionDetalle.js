const { db } = require("../../connectors/dbconnect");
const { procesaCRUD, formatDateDB } = require("../../helpers/procesaCRUD");
const moment = require("moment");

const collection = "importacionDet";
const campoCollection = "bl";
const formatDate = "YYYY-MM-DD HH:mm:ss";

//CREATE O INSERT
exports.nuevoRegistro = async (req, res) => {
  try {
    const jsonInsert = {
      bl: req.body.bl,
      //detalle: req.body.valoresTabla || [],
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
          BL_IMPORTACION: element.bl || "",
          USUARIO_CREACION: element.usuarioCrea || "",
          FECHA_CREACION: formatDateDB(element.fechaCreacion, formatDate),
          ESTADO:
            element.estado == "A"
              ? "Activo"
              : element.estado == "F"
              ? "Finalizado"
              : "Eliminado",
          NOMBREDELETE: element.bl || "",
          DETALLES: element?.detalle?.length || 0,
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
          BL_IMPORTACION: "",
        },
      ];
    }

    columnas = Object.keys(filas[0])
      .filter(
        (key) => key !== "ID" && key !== "NOMBREDELETE" && key !== "DETALLES"
      )
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
    let dbImportaciones = [];

    // Obtener las importaciones finalizadas
    const dbImportacionesFinSnapshot = await db
      .collection("importacionEnc")
      .where("estado", "==", "F")
      .get();

    // Si no hay importaciones finalizadas, retornamos un array vacío
    if (!dbImportacionesFinSnapshot.empty) {
      // Obtener las importaciones pendientes
      const dbImportacionesPendSnapshot = await db
        .collection(collection)
        .where("estado", "!=", "N")
        .get();

      // Crear un conjunto (Set) con todos los números "bl" de dbImportacionesPend
      const blPendientes = new Set();
      if (!dbImportacionesPendSnapshot.empty) {
        dbImportacionesPendSnapshot.forEach((doc) => {
          const bl = doc.data().bl;
          if (bl) blPendientes.add(bl);
        });
      }

      // Filtrar dbImportacionesFin para obtener solo las importaciones que no están en dbImportacionesPend
      const importacionesNoEnPendientes =
        dbImportacionesFinSnapshot.docs.filter((doc) => {
          const bl = `${doc.data().bl} - ${doc.data().embarcador}`;
          return bl && !blPendientes.has(bl);
        });

      // Mapear los documentos filtrados para obtener sus datos
      dbImportaciones = importacionesNoEnPendientes
        .map((doc) => ({
          id: `${doc.data().bl} - ${doc.data().embarcador}`,
          descripcion: `${doc.data().bl} - ${doc.data().embarcador}`,
        }))
        .sort((a, b) => {
          // Ordenar por id (bl) de forma ascendente
          return a.id.localeCompare(b.id);
        });
    }

    // Obtener condiciones
    valSelect = {
      Importaciones: dbImportaciones,
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
      bl: req.body.bl,
      detalle: req.body.valoresTabla,
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

    const registros = [];
    if (
      Array.isArray(dbConsultaIDData?.detalle) &&
      dbConsultaIDData.detalle.length > 0
    ) {
      dbConsultaIDData.detalle.forEach((obj) => {
        const registro = {
          ["Item Code"]: {
            value: obj["Item Code"],
            elemento: "input",
            type: "text",
            placeholder: "Item Code",
            tamanio: 15,
            obligatorio: true,
            disabled: false,
          },
          ["Family Code"]: {
            value: obj["Family Code"],
            elemento: "input",
            type: "text",
            placeholder: "Family Code",
            tamanio: 25,
            obligatorio: true,
            disabled: false,
          },
          Descripcion: {
            value: obj.Descripcion,
            elemento: "input",
            type: "text",
            placeholder: "Descripcion",
            tamanio: 150,
            obligatorio: true,
            disabled: false,
          },
          CTNS: {
            value: obj.CTNS,
            elemento: "input",
            type: "number",
            placeholder: "",
            tamanio: 5,
            obligatorio: true,
            disabled: false,
          },
          ["QTY PZA X CAJA"]: {
            value: obj["QTY PZA X CAJA"],
            elemento: "input",
            type: "number",
            placeholder: "",
            tamanio: 5,
            obligatorio: true,
            disabled: false,
          },
          ["TOTAL QTY"]: {
            value: obj["TOTAL QTY"],
            elemento: "input",
            type: "number",
            placeholder: "",
            tamanio: 5,
            obligatorio: true,
            disabled: true,
          },
        };
        registros.push(registro);
      });
    }

    //Armado de filas (data) y columnas para pintar tabla
    const json = {
      info: {
        id: dbConsultaID.id,
        bl: dbConsultaIDData.bl,
      },
      tabla: registros,
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
    elemento: "select",
    type: "select",
    name: "bl",
    id_input: "bl",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Importación",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Seleccione la importación",
    className: "col-md-9 mb-3",
    CRUD: {
      create: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "bl",
    id_input: "bl",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: true,
    titulo: "Importación",
    tamanio: 20,
    obligatorio: true,
    placeholder: "Importación",
    className: "col-md-9 mb-3",
    CRUD: {
      read: {},
      update: {},
    },
  },
  {
    elemento: "table",
    type: "table",
    classNameLabel: "table table-bordered",
    disabled: false,
    tamanio: 10,
    className: "table-responsive",
    CRUD: {
      //create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea eliminar el detalle de la importación",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      delete: {},
    },
  },
];
