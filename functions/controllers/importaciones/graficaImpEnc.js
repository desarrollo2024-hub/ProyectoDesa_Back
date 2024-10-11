const { db } = require("../../connectors/dbconnect");
const collection = "importacionEnc";

//READ OR CONSULT
exports.consultarRegistros = async (req, res) => {
  try {
    let { filtro } = req.params;

    if (filtro) {
      filtro = filtro.split("");
    } else {
      filtro = [];
    }

    const dbConsulta = await getImportacionesData();

    // Uso de la función
    const processedData = processDbResults(dbConsulta);
    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosamente",
      respuesta: processedData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

const processDbResults = (dbConsulta) => {
  const result = {
    anioSalida: {},
    mesSalida: {},
    diaSalida: {},
    puertoOrigen: {},
    puertoDestino: {},
    dias: {
      maximo: -Infinity,
      minimo: Infinity,
      promedio: 0,
    },
    anioArribo: {},
    mesArribo: {},
    diaArribo: {},
  };

  let totalDias = 0;

  dbConsulta.forEach((row) => {
    // Año de salida
    result.anioSalida[row.AnoSalida] =
      (result.anioSalida[row.AnoSalida] || 0) + 1;

    // Mes de salida
    result.mesSalida[row.MesSalida] =
      (result.mesSalida[row.MesSalida] || 0) + 1;

    // Día de salida
    result.diaSalida[row.DiaSalida] =
      (result.diaSalida[row.DiaSalida] || 0) + 1;

    // Año de Arribo
    result.anioArribo[row.AnoArribo] =
      (result.anioArribo[row.AnoArribo] || 0) + 1;

    // Mes de Arribo
    result.mesArribo[row.MesArribo] =
      (result.mesArribo[row.MesArribo] || 0) + 1;

    // Día de Arribo
    result.diaArribo[row.DiaArribo] =
      (result.diaArribo[row.DiaArribo] || 0) + 1;

    // Puerto de origen
    result.puertoOrigen[row.puertoOrigen] =
      (result.puertoOrigen[row.puertoOrigen] || 0) + 1;

    // Puerto de destino
    result.puertoDestino[row.puertoDestino] =
      (result.puertoDestino[row.puertoDestino] || 0) + 1;

    // Días
    result.dias.maximo = Math.max(result.dias.maximo, row.Dias);
    result.dias.minimo = Math.min(result.dias.minimo, row.Dias);
    totalDias += row.Dias;
  });

  // Calcular promedio de días
  result.dias.promedio = (totalDias / dbConsulta.length).toFixed(2);

  return result;
};

async function getImportacionesData() {
  try {
    const importacionesSnapshot = await db
      .collection(collection)
      .where("estado", "!=", "N")
      .get();

    const dbConsulta = importacionesSnapshot.docs.map((doc) => {
      const data = doc.data();
      const fechaSalida = data.fechaSalida.toDate();
      const fechaArribo = data.fechaArribo.toDate();

      return {
        AnoSalida: fechaSalida.getFullYear(),
        MesSalida: fechaSalida.getMonth() + 1,
        DiaSalida: fechaSalida.getDate(),
        puertoOrigen: data.puertoOrigen,
        puertoDestino: data.puertoDestino,
        Dias: Math.floor((fechaArribo - fechaSalida) / (1000 * 60 * 60 * 24)),
        AnoArribo: fechaArribo.getFullYear(),
        MesArribo: fechaArribo.getMonth() + 1,
        DiaArribo: fechaArribo.getDate(),
        estado: data.estado,
      };
    });

    // Ordenar los resultados para simular el ORDER BY de SQL
    dbConsulta.sort((a, b) => {
      if (a.AnoSalida !== b.AnoSalida) return b.AnoSalida - a.AnoSalida;
      if (a.MesSalida !== b.MesSalida) return b.MesSalida - a.MesSalida;
      return b.DiaSalida - a.DiaSalida;
    });

    return dbConsulta;
  } catch (error) {
    console.error("Error al obtener importaciones:", error);
    throw error;
  }
}
