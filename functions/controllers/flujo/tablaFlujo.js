const { db } = require("../../connectors/dbconnect");
const { formatDateDB } = require("../../helpers/procesaCRUD");

const collection = "importacionFlujo";
const formatDate = "YYYY-MM-DD HH:mm:ss";

exports.consultarRegistros = async (req, res) => {
  try {
    let { filtro } = req.params;
    let textoFiltro = filtro;

    let dbConsulta = [{}];
    let filas = [];
    let columnas = [];
    let nombreCompleto = "";

    if (filtro) {
      filtro = filtro ? filtro.split("") : [];

      let query = db.collection(collection);
      if (req.usuario.tipo === "Cliente") {
        nombreCompleto = `${req.usuario.nombre} ${req.usuario.apellidos}`;
        query = query.where("cliente", "==", nombreCompleto);
      }

      dbConsulta = await query.orderBy("fecha", "desc").get();

      // Crear un objeto para agrupar por BL
      const blGroups = {};

      dbConsulta?.docs.forEach((data) => {
        const element = data.data();
        const bl = element.bl || "";

        let fila = {
          ID: data.id,
          BL_IMPORTACION: bl,
          ETAPA: element.etapa || "",
          CLIENTE_ASIGNADO: element.cliente || "",
          USUARIO: element.usuario || "",
          FECHA: formatDateDB(element.fecha, formatDate),
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

        if (!blGroups[bl]) {
          blGroups[bl] = { ...fila, subRows: [] };
        } else {
          blGroups[bl].subRows.push(fila);
        }
      });

      // Convertir el objeto agrupado en un array
      filas = Object.values(blGroups);
    }

    // Retornar filas vacías para armar las columnas si no hay datos
    if (dbConsulta.empty) {
      filas = [
        {
          BL_IMPORTACION: "",
          ETAPA: "",
          CLIENTE_ASIGNADO: "",
          USUARIO_CREACION: "",
        },
      ];
    }

    columnas = Object.keys(filas[0])
      .filter(
        (key) =>
          key !== "ID" &&
          key !== "NOMBREDELETE" &&
          key !== "DETALLES" &&
          key !== "subRows"
      )
      .map((key) => ({
        accessorKey: key,
        header: key.replace(/_/g, " "),
        size: 20,
      }));

    if (dbConsulta.empty) {
      filas = [];
    }

    const json = {
      tabla: {
        data: filas,
        columnas: columnas,
      },
      valSelect: [],
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
