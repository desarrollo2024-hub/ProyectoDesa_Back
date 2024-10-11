const { db } = require("../../connectors/dbconnect");

//READ OR CONSULT
exports.consultarRegistros = async (req, res) => {
  try {
    let filas = [];
    let columnas = [];
    const inventario = {};

    // 1. Procesar importaciones
    const importacionesSnapshot = await db
      .collection("importacionDet")
      .where("estado", "==", "F")
      .get();

    importacionesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (Array.isArray(data.detalle)) {
        data.detalle.forEach((item) => {
          const itemCode = item["Item Code"];
          if (!inventario[itemCode]) {
            inventario[itemCode] = {
              itemCode: itemCode,
              descripcion: item.Descripcion,
              itemFamily: item["Family Code"],
              qtyPzaXCaja: item["QTY PZA X CAJA"],
              importadoCTN: 0,
              importadoQTY: 0,
              despachadoCTN: 0,
              despachadoQTY: 0,
              stockCTN: 0,
              stockQTY: 0,
            };
          }
          inventario[itemCode].importadoCTN += item.CTNS || 0;
          inventario[itemCode].importadoQTY += item["TOTAL QTY"] || 0;
        });
      }
    });

    // 2. Procesar despachos
    const despachosSnapshot = await db
      .collection("despacho")
      .where("estado", "==", "F")
      .get();

    despachosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (Array.isArray(data.detalle)) {
        data.detalle.forEach((item) => {
          const itemCode = item["Item Code"];
          if (!inventario[itemCode]) {
            inventario[itemCode] = {
              itemCode: itemCode,
              descripcion: item.Descripcion,
              itemFamily: item["Family Code"],
              qtyPzaXCaja: item["QTY PZA X CAJA"],
              importadoCTN: 0,
              importadoQTY: 0,
              despachadoCTN: 0,
              despachadoQTY: 0,
              stockCTN: 0,
              stockQTY: 0,
            };
          }
          inventario[itemCode].despachadoCTN += item.CTNS || 0;
          inventario[itemCode].despachadoQTY += item["TOTAL QTY"] || 0;
        });
      }
    });

    // 3. Calcular stock y convertir a array
    const dbConsulta = Object.values(inventario).map((item) => {
      item.stockCTN = item.importadoCTN - item.despachadoCTN;
      item.stockQTY = item.importadoQTY - item.despachadoQTY;
      return item;
    });

    // 4. Ordenar por itemCode
    //Retorna el nuevo json que se pintara en la tabla
    filas = dbConsulta
      ?.filter((item) => item.stockQTY > 0)
      .map((element) => {
        let fila = {
          ID: element.itemCode,
          ITEM_CODE: element.itemCode,
          FAMILY_CODE: element.itemFamily || "",
          DESCRIPCION: element.descripcion || "",
          CTNS: element.stockCTN || 0,
          QTY_PZA_X_CAJA: element.qtyPzaXCaja || 0,
          STOCK: element.stockQTY || 0,
        };
        return fila;
      });

    //Retornar filas vacias para armar las columnas
    if (dbConsulta.empty) {
      filas = [
        {
          ITEM_CODE: "",
          FAMILY_CODE: "",
          DESCRIPCION: "",
          CTNS: "",
          QTY_PZA_X_CAJA: "",
          STOCK: "",
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

    const json = {
      tabla: {
        data: filas,
        columnas: columnas,
      },
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
