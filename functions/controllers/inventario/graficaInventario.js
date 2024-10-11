const { db } = require("../../connectors/dbconnect");

//READ OR CONSULT
exports.consultarRegistros = async (req, res) => {
  try {
    const despachosData = await getDespachosData();
    const processedData = processDespachosData(despachosData);

    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosa",
      respuesta: processedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

async function getDespachosData() {
  const despachosSnapshot = await db
    .collection("despacho")
    .where("estado", "==", "F")
    .get();

  return despachosSnapshot.docs.map((doc) => {
    const data = doc.data();
    const fechaCreacion = data.fechaCreacion.toDate();

    return {
      ano: fechaCreacion.getFullYear(),
      mes: fechaCreacion.getMonth() + 1,
      dia: fechaCreacion.getDate(),
      fechaCompleta: `${fechaCreacion.getFullYear()}-${String(
        fechaCreacion.getMonth() + 1
      ).padStart(2, "0")}-${String(fechaCreacion.getDate()).padStart(2, "0")}`,
      detalle: data.detalle || [],
    };
  });
}

function processDespachosData(despachosData) {
  const result = {
    despachosPorAno: {},
    productosMasDespachados: {},
    fechasMasDespachadas: {},
    sucursalesConMasDespachos: {}, // Cambiado a contar frecuencia de despachos
    cantidadDespachosPorSucursal: {}, // Nueva métrica para cantidad de productos por sucursal
    cantidadTotalDespachos: 0, // Nueva métrica para cantidad total de despachos
  };

  despachosData.forEach((despacho) => {
    // Despachos por año
    result.despachosPorAno[despacho.ano] =
      (result.despachosPorAno[despacho.ano] || 0) + 1;

    // Fecha más despachada
    result.fechasMasDespachadas[despacho.fechaCompleta] =
      (result.fechasMasDespachadas[despacho.fechaCompleta] || 0) + 1;

    // Incrementar la cantidad total de despachos
    result.cantidadTotalDespachos += 1;

    const sucursalesProcesadas = new Set(); // Para evitar contar la misma sucursal más de una vez por despacho

    despacho.detalle.forEach((item) => {
      const itemCode = item["Item Code"];
      const cantidad = item["TOTAL QTY"] || 0;

      // Productos más despachados
      result.productosMasDespachados[itemCode] =
        (result.productosMasDespachados[itemCode] || 0) + cantidad;

      if (item.Sucursal) {
        // Contar la frecuencia de despachos por sucursal
        if (!sucursalesProcesadas.has(item.Sucursal)) {
          result.sucursalesConMasDespachos[item.Sucursal] =
            (result.sucursalesConMasDespachos[item.Sucursal] || 0) + 1;
          sucursalesProcesadas.add(item.Sucursal);
        }

        // Sumar la cantidad de productos despachados por sucursal
        result.cantidadDespachosPorSucursal[item.Sucursal] =
          (result.cantidadDespachosPorSucursal[item.Sucursal] || 0) + cantidad;
      }
    });
  });

  // Convertir objetos a arrays ordenados
  result.despachosPorAno = objectToSortedArray(
    result.despachosPorAno,
    "Año",
    "Cantidad"
  );
  result.productosMasDespachados = objectToSortedArray(
    result.productosMasDespachados,
    "Producto",
    "Cantidad",
    10
  );
  result.fechasMasDespachadas = objectToSortedArray(
    result.fechasMasDespachadas,
    "Fecha",
    "Cantidad",
    10
  );
  result.sucursalesConMasDespachos = objectToSortedArray(
    result.sucursalesConMasDespachos,
    "Sucursal",
    "Cantidad",
    10
  );
  result.cantidadDespachosPorSucursal = objectToSortedArray(
    result.cantidadDespachosPorSucursal,
    "Sucursal",
    "Cantidad",
    10
  );

  return result;
}

function objectToSortedArray(obj, keyName, valueName, limit = null) {
  const arr = Object.entries(obj).map(([key, value]) => ({
    [keyName]: key,
    [valueName]: value,
  }));
  arr.sort((a, b) => b[valueName] - a[valueName]);
  return limit ? arr.slice(0, limit) : arr;
}
