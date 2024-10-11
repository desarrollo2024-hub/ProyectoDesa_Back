const { db } = require("../../connectors/dbconnect");
const admin = require("firebase-admin");

const collection = "despacho";

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
              bls: new Set(), // Set para BLs únicos
              sucursales: new Set(), // Set para sucursales únicas
            };
          }
          inventario[itemCode].importadoCTN += item.CTNS || 0;
          inventario[itemCode].importadoQTY += item["TOTAL QTY"] || 0;
          inventario[itemCode].bls.add(data.bl); // Añadir BL al ítem
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
              bls: new Set(), // Set para BLs únicos
              sucursales: new Set(), // Set para sucursales únicas
            };
          }
          inventario[itemCode].despachadoCTN += item.CTNS || 0;
          inventario[itemCode].despachadoQTY += item["TOTAL QTY"] || 0;
          if (item.Sucursal) {
            inventario[itemCode].sucursales.add(item.Sucursal); // Añadir sucursal al ítem
          }
        });
      }
    });

    // 3. Calcular stock y convertir a array
    const dbConsulta = Object.values(inventario).map((item) => {
      item.stockCTN = item.importadoCTN - item.despachadoCTN;
      item.stockQTY = item.importadoQTY - item.despachadoQTY;
      item.bls = Array.from(item.bls); // Convertir Sets a Arrays
      item.sucursales = Array.from(item.sucursales); // Convertir Sets a Arrays
      return item;
    });

    // 4. Ordenar por itemCode
    //Retorna el nuevo json que se pintara en la tabla
    filas = dbConsulta
      ?.sort((a, b) => a.itemCode.localeCompare(b.itemCode))
      .map((element) => {
        let fila = {
          ID: element.itemCode,
          ITEM_CODE: element.itemCode,
          FAMILY_CODE: element.itemFamily || "",
          DESCRIPCION: element.descripcion || "",
          CTNS_IMPORTACION: element.importadoCTN || 0,
          CTNS_DESPACHO: element.despachadoCTN || 0,
          CTNS_EXISTENTES: element.stockCTN || 0,
          QTY_PZA_X_CAJA: element.qtyPzaXCaja || 0,
          QTY_TOTAL_IMPORTACION: element.importadoQTY || 0,
          QTY_TOTAL_DESPACHO: element.despachadoQTY || 0,
          QTY_TOTAL_EXISTENTES: element.stockQTY || 0,
          BLs: element.bls,
          SUCURSALES: element.sucursales,
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
          CTNS_IMPORTACION: "",
          CTNS_DESPACHO: "",
          CTNS_EXISTENTES: "",
          QTY_PZA_X_CAJA: "",
          QTY_TOTAL_IMPORTACION: "",
          QTY_TOTAL_DESPACHO: "",
          QTY_TOTAL_EXISTENTES: "",
        },
      ];
    }

    columnas = Object.keys(filas[0])
      .filter((key) => key !== "ID" && key !== "BLs" && key !== "SUCURSALES")
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
    //

    //console.log(JSON.stringify(json));

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

//READ OR CONSULT ONE
exports.consultarRegPorID = async (req, res) => {
  try {
    let { id, opcion } = req.params;
    const dbConsultaID = await db.collection(collection).doc(id).get();

    if (!dbConsultaID.exists || dbConsultaID.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbConsultaIDData = dbConsultaID.data();
    let itemsProcessed = [];

    // Obtener las importaciones finalizadas
    if (opcion == 2) {
      // Obtener todos los documentos con el mismo BL, excluyendo el documento actual
      const otrosDocumentos = await db
        .collection(collection)
        .where("bl", "==", dbConsultaIDData.bl)
        .where(admin.firestore.FieldPath.documentId(), "!=", id)
        .get();

      // Objeto para almacenar las sumas de los otros documentos
      const sumasOtrosDocumentos = {};

      // Sumar los valores de los otros documentos
      otrosDocumentos.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.detalle)) {
          data.detalle.forEach((item) => {
            const itemCode = item["Item Code"];
            if (!sumasOtrosDocumentos[itemCode]) {
              sumasOtrosDocumentos[itemCode] = {
                CTNS: 0,
                "TOTAL QTY": 0,
              };
            }
            sumasOtrosDocumentos[itemCode].CTNS += item.CTNS || 0;
            sumasOtrosDocumentos[itemCode]["TOTAL QTY"] +=
              item["TOTAL QTY"] || 0;
          });
        }
      });

      const dbItems = await db
        .collection("importacionDet")
        .where("bl", "==", dbConsultaIDData.bl)
        .where("estado", "==", "F")
        .get();

      if (!dbItems.empty) {
        dbItems.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.detalle) && data.detalle.length > 0) {
            data.detalle.map((item) => {
              const itemCode = item["Item Code"];
              const sumasOtros = sumasOtrosDocumentos[itemCode] || {
                CTNS: 0,
                "TOTAL QTY": 0,
              };

              if (Math.max(0, (item.CTNS || 0) - sumasOtros.CTNS) > 0) {
                itemsProcessed.push({
                  value: itemCode,
                  descripcion: itemCode,
                  descripcionItem: item.Descripcion,
                  familyCode: item["Family Code"],
                  ctns: Math.max(0, (item.CTNS || 0) - sumasOtros.CTNS),
                  qtyPzaXCaja: item["QTY PZA X CAJA"],
                  totalQty: Math.max(
                    0,
                    (item["TOTAL QTY"] || 0) - sumasOtros["TOTAL QTY"]
                  ),
                  sucursal: item.Sucursal || "",
                });
              }
            });
          }
        });
      }

      // Ordenar los items procesados por id
      itemsProcessed.sort((a, b) => a.value.localeCompare(b.value));
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
            elemento: `${opcion == 2 ? "select" : "input"}`,
            type: `${opcion == 2 ? "select" : "text"}`,
            placeholder: "Item Code",
            tamanio: 15,
            obligatorio: true,
            disabled: false,
            especial: "select",
            width: "160px",
          },
          ["Family Code"]: {
            value: obj["Family Code"],
            elemento: "input",
            type: "text",
            placeholder: "Family Code",
            tamanio: 25,
            obligatorio: true,
            disabled: true,
          },
          Descripcion: {
            value: obj.Descripcion,
            elemento: "input",
            type: "text",
            placeholder: "Descripcion",
            tamanio: 150,
            obligatorio: true,
            disabled: true,
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
            disabled: true,
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
          Sucursal: {
            value: obj.Sucursal,
            elemento: "select",
            type: "select",
            placeholder: "Sucursal",
            tamanio: 20,
            obligatorio: true,
            disabled: false,
            especial: "select",
            width: "200px",
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
      items: itemsProcessed,
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
