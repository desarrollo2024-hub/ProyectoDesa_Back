const { db } = require("../../connectors/dbconnect");
const path = require("path");
const fs = require("fs");
const busboy = require("busboy");
const ExcelJS = require("exceljs");
const moment = require("moment");
const admin = require("firebase-admin");

async function eliminaArchivo(rutaCompleta) {
  try {
    fs.unlink(rutaCompleta, async (err) => {
      if (err) {
        console.error("Error al eliminar el archivo:", err);
        return 1;
      }
    });
  } catch (error) {
    console.error("Error al eliminar el archivo:", error);
  }
}

exports.cargaXLSDespacho = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      codigo: 405,
      mensaje: `Metodo incorrecto`,
    });
  }

  // Función para manejar el procesamiento del formulario
  const processForm = async () => {
    return new Promise((resolve, reject) => {
      const fields = {};
      let excelData = null;

      const bb = busboy({ headers: req.headers });

      bb.on("file", (name, file, info) => {
        const chunks = [];
        file.on("data", (data) => {
          chunks.push(data);
        });
        file.on("end", () => {
          excelData = Buffer.concat(chunks);
        });
      });

      bb.on("field", (name, val) => {
        fields[name] = val;
      });

      bb.on("finish", () => {
        resolve({ fields, excelData });
      });

      bb.on("error", (error) => {
        reject(error);
      });

      if (req.rawBody) {
        bb.end(req.rawBody);
      } else {
        req.pipe(bb);
      }
    });
  };

  try {
    const { fields, excelData } = await processForm();

    if (!excelData) {
      throw new Error("No se ha subido ningún archivo");
    }

    // 1. Obtener datos de Firestore
    const doc = fields.id;
    const collection = "despacho";

    const dbModifica = db.collection(collection).doc(doc);
    const dbModificaVal = await dbModifica.get();

    if (!dbModificaVal.exists || dbModificaVal.data().estado === "N") {
      throw new Error(
        "Registro no encontrado o inactivo, favor recargue la página"
      );
    }

    // 2. Obtener las importaciones finalizadas y calcular sumas
    const sumasDisponibles = await obtenerSumasDisponibles(
      dbModificaVal.data().bl,
      doc
    );

    // 3. Leer y procesar el Excel
    const resultadosExcel = await procesarExcel(excelData);

    // 4. Validar y ajustar los datos del Excel contra las sumas disponibles
    const resultadosValidados = validarDatosExcel(
      resultadosExcel,
      sumasDisponibles
    );

    // 5. Actualizar Firestore con los resultados validados
    const jsonUpdate = {
      detalle: resultadosValidados.itemsValidos,
      fechaModificacion: moment(),
    };

    await dbModifica.update(jsonUpdate);

    const mensajeGod =
      resultadosValidados.itemsValidos.length > 0
        ? `${resultadosValidados.itemsValidos.length} registros insertados.`
        : "";
    const mensajeBad =
      resultadosValidados.itemsInvalidos.length > 0
        ? `${resultadosValidados.itemsInvalidos.length} registros no insertados por exceder la cantidad disponible o no cargarse en la importación`
        : "";
    // 6. Preparar respuesta
    const mensaje = `${mensajeGod} ${mensajeBad}`;
    const codigo = resultadosValidados.itemsValidos.length > 0 ? 200 : 500;

    return res.status(codigo).json({
      codigo: codigo,
      mensaje: mensaje,
    });
  } catch (error) {
    console.error("Error en la función cargaXLSDetImpor:", error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error al procesar el archivo: ${error.message}`,
    });
  }
};

exports.descargaXLSDespacho = async (req, res) => {
  try {
    const { id } = req.params;
    const collection = "despacho";

    const dbModifica = db.collection(collection).doc(id);
    const dbModificaVal = await dbModifica.get();

    if (!dbModificaVal.exists || dbModificaVal.data().estado === "N") {
      return res.status(500).json({
        codigo: 500,
        mensaje: "Registro no encontrado o inactivo, favor recargue la página",
      });
    }

    const dbData = dbModificaVal.data();
    let registros = [];
    if (Array.isArray(dbData?.detalle) && dbData.detalle.length > 0) {
      registros = dbData.detalle;
    } else {
      return res.status(500).json({
        codigo: 500,
        mensaje: "No tiene detalle la importación a descargar",
      });
    }

    // Crear una nueva hoja de cálculo
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Datos");

    // Obtener los títulos (asumiendo que todos los registros tienen la misma estructura)
    const Titulos = [
      "Item Code",
      "Family Code",
      "Descripcion",
      "CTNS",
      "QTY PZA X CAJA",
      "TOTAL QTY",
      "Sucursal",
    ];
    let filaInicio = 1;

    // Crear la tabla
    const tabla = ws.addTable({
      name: "Despacho",
      ref: `A${filaInicio}`,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleLight9",
        showRowStripes: true,
      },
      columns: Titulos.map((titulo) => ({ name: titulo.toUpperCase() })),
      rows: registros.map((registro) =>
        Titulos.map((titulo) => registro[titulo])
      ),
    });

    // Centrar verticalmente y horizontalmente los títulos
    ws.getRow(filaInicio).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    //Tamaños de columnas
    const columnWidths = [15, 20, 30, 8, 15, 13, 10, 15]; // Ancho deseado para cada columna
    columnWidths.forEach((width, index) => {
      ws.getColumn(index + 1).width = width; // +1 porque los índices de columna comienzan en 1
    });

    // Generar el archivo Excel en un buffer
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    console.error(
      "Error en la creación del archivo XLS Detalle Importacion:",
      error
    );
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error al generar el archivo: ${error.message}`,
    });
  }
};

exports.descargaPlantillaXLSDespacho = async (req, res) => {
  try {
    const { id } = req.params;
    const collection = "despacho";

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
          sumasOtrosDocumentos[itemCode]["TOTAL QTY"] += item["TOTAL QTY"] || 0;
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
                "Item Code": itemCode,
                Descripcion: item.Descripcion,
                "Family Code": item["Family Code"],
                CTNS: Math.max(0, (item.CTNS || 0) - sumasOtros.CTNS),
                "QTY PZA X CAJA": item["QTY PZA X CAJA"],
                "TOTAL QTY": Math.max(
                  0,
                  (item["TOTAL QTY"] || 0) - sumasOtros["TOTAL QTY"]
                ),
                Sucursal: item.Sucursal || "",
              });
            }
          });
        }
      });
    }

    // Ordenar los items procesados por id
    itemsProcessed.sort((a, b) => a["Item Code"].localeCompare(b["Item Code"]));

    // Crear una nueva hoja de cálculo
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Datos");

    // Obtener los títulos (asumiendo que todos los registros tienen la misma estructura)
    const Titulos = [
      "Item Code",
      "Family Code",
      "Descripcion",
      "CTNS",
      "QTY PZA X CAJA",
      "TOTAL QTY",
      "Sucursal",
    ];
    let filaInicio = 1;
    // Lista de sucursales permitidas
    const dbSucursalesSnap = await db
      .collection("sucursal")
      .where("estado", "!=", "N")
      .get();

    // Extraer y formatear los nombres de las sucursales
    const nombresSucursales = dbSucursalesSnap.docs
      .map((doc) => doc.data().nombre)
      .filter((nombre) => nombre); // Filtrar nombres vacíos o undefined

    // Formatear los nombres como una cadena para la validación de Excel
    const sucursalesString = nombresSucursales.join(",");

    // Crear la tabla
    ws.addTable({
      name: "Despacho",
      ref: `A${filaInicio}`,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleLight9",
        showRowStripes: true,
      },
      columns: Titulos.map((titulo) => ({ name: titulo.toUpperCase() })),
      rows: itemsProcessed.map((registro) =>
        Titulos.map((titulo) => registro[titulo])
      ),
    });

    // Centrar verticalmente y horizontalmente los títulos
    ws.getRow(filaInicio).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    //Tamaños de columnas
    const columnWidths = [15, 20, 30, 8, 15, 13, 10, 15]; // Ancho deseado para cada columna
    columnWidths.forEach((width, index) => {
      ws.getColumn(index + 1).width = width; // +1 porque los índices de columna comienzan en 1
    });

    for (let i = filaInicio + 1; i <= itemsProcessed.length + filaInicio; i++) {
      const row = ws.getRow(i);
      row.getCell("G").dataValidation = {
        type: "list",
        allowBlank: false, // No permitir valores en blanco
        formulae: [`"${sucursalesString}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Error de entrada",
        error: "Por favor, seleccione una sucursal válida de la lista.",
      };
    }

    // Generar el archivo Excel en un buffer
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    console.error(
      "Error en la creación del archivo XLS Detalle Importacion:",
      error
    );
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error al generar el archivo: ${error.message}`,
    });
  }
};

//Se utiliza para poder leer y cargar el excel de detalle de importación
exports.cargaXLSDetImpor = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      codigo: 405,
      mensaje: `Metodo incorrecto`,
    });
  }

  // Función para manejar el procesamiento del formulario
  const processForm = async () => {
    return new Promise((resolve, reject) => {
      const fields = {};
      let excelData = null;

      const bb = busboy({ headers: req.headers });

      bb.on("file", (name, file, info) => {
        const chunks = [];
        file.on("data", (data) => {
          chunks.push(data);
        });
        file.on("end", () => {
          excelData = Buffer.concat(chunks);
        });
      });

      bb.on("field", (name, val) => {
        fields[name] = val;
      });

      bb.on("finish", () => {
        resolve({ fields, excelData });
      });

      bb.on("error", (error) => {
        reject(error);
      });

      if (req.rawBody) {
        bb.end(req.rawBody);
      } else {
        req.pipe(bb);
      }
    });
  };

  try {
    const { fields, excelData } = await processForm();

    if (!excelData) {
      throw new Error("No se ha subido ningún archivo");
    }

    const doc = fields.id;
    const collection = "importacionDet";

    const dbModifica = db.collection(collection).doc(doc);
    const dbModificaVal = await dbModifica.get();

    if (!dbModificaVal.exists || dbModificaVal.data().estado === "N") {
      throw new Error(
        "Registro no encontrado o inactivo, favor recargue la página"
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelData);

    const worksheet = workbook.getWorksheet(1);
    const resultados = [];

    // Procesar el archivo Excel...
    const headers = worksheet.getRow(1).values.slice(1);
    if (
      headers[1] === "Item Codigo" &&
      headers[2] === "family Code" &&
      headers[3] === "DESCRIPTION" &&
      headers[4] === "CTNS" &&
      headers[5] === "QTY PZA X CAJA"
    ) {
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const [No, Item, family, description, ctns, qtyxpza] =
          row.values.slice(1);

        const Registro = {
          CTNS: parseInt(ctns) || 0,
          Descripcion: description?.toString().trim() || "",
          "Family Code": family?.toString().trim() || "",
          "Item Code": Item?.toString().trim(),
          "QTY PZA X CAJA": parseInt(qtyxpza) || 0,
          "TOTAL QTY": (parseInt(ctns) || 0) * (parseInt(qtyxpza) || 0),
        };

        if (!Registro["Item Code"]) {
          break;
        }
        resultados.push(Registro);
      }
    } else {
      throw new Error("Formato de Excel diferente a la plantilla, validar");
    }

    const jsonUpdate = {
      detalle: resultados,
      fechaModificacion: moment(),
    };

    await dbModifica.update(jsonUpdate);

    const codigo = resultados.length === 0 ? 500 : 200;
    const mensaje =
      resultados.length > 0
        ? resultados.length + " registros insertados"
        : "No se insertó ningún registro";

    return res.status(codigo).json({
      codigo: codigo,
      mensaje: mensaje,
    });
  } catch (error) {
    console.error("Error en la función cargaXLSDetImpor:", error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error al procesar el archivo: ${error.message}`,
    });
  }
};

exports.descargaXLSDetImpor = async (req, res) => {
  try {
    const { id } = req.params;
    const collection = "importacionDet";

    const dbModifica = db.collection(collection).doc(id);
    const dbModificaVal = await dbModifica.get();

    if (!dbModificaVal.exists || dbModificaVal.data().estado === "N") {
      return res.status(500).json({
        codigo: 500,
        mensaje: "Registro no encontrado o inactivo, favor recargue la página",
      });
    }

    const dbData = dbModificaVal.data();
    let registros = [];
    if (Array.isArray(dbData?.detalle) && dbData.detalle.length > 0) {
      registros = dbData.detalle;
    } else {
      return res.status(500).json({
        codigo: 500,
        mensaje: "No tiene detalle la importación a descargar",
      });
    }

    // Crear una nueva hoja de cálculo
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Datos");

    // Obtener los títulos (asumiendo que todos los registros tienen la misma estructura)
    const Titulos = [
      "Item Code",
      "Family Code",
      "Descripcion",
      "CTNS",
      "QTY PZA X CAJA",
      "TOTAL QTY",
    ];
    let filaInicio = 1;

    // Crear la tabla
    ws.addTable({
      name: "Importacion",
      ref: `A${filaInicio}`,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleLight9",
        showRowStripes: true,
      },
      columns: Titulos.map((titulo) => ({ name: titulo.toUpperCase() })),
      rows: registros.map((registro) =>
        Titulos.map((titulo) => registro[titulo])
      ),
    });

    // Centrar verticalmente y horizontalmente los títulos
    ws.getRow(filaInicio).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    //Tamaños de columnas
    const columnWidths = [15, 20, 30, 8, 15, 13, 10]; // Ancho deseado para cada columna
    columnWidths.forEach((width, index) => {
      ws.getColumn(index + 1).width = width; // +1 porque los índices de columna comienzan en 1
    });

    // Generar el archivo Excel en un buffer
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (error) {
    console.error(
      "Error en la creación del archivo XLS Detalle Importacion:",
      error
    );
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error al generar el archivo: ${error.message}`,
    });
  }
};

exports.PlantillasXLS = async (req, res) => {
  try {
    const nombreArchivo = req.params.nombreArchivo;

    const ruta = path.resolve(
      __dirname,
      `../../archivos/plantillasExcel/${nombreArchivo}.xlsx`
    );
    res.sendFile(ruta, (err) => {
      if (err) {
        console.log(err);
        res.status(500).json({
          codigo: 500,
          mensaje: `Error al descargar el archivo: ${err.message}`,
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

async function obtenerSumasDisponibles(bl, idActual) {
  const sumasDisponibles = {};

  // Obtener todos los documentos con el mismo BL, excluyendo el documento actual
  const otrosDocumentos = await db
    .collection("despacho")
    .where("bl", "==", bl)
    .where(admin.firestore.FieldPath.documentId(), "!=", idActual)
    .get();

  // Sumar los valores de los otros documentos
  otrosDocumentos.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.detalle)) {
      data.detalle.forEach((item) => {
        const itemCode = item["Item Code"];
        if (!sumasDisponibles[itemCode]) {
          sumasDisponibles[itemCode] = {
            CTNS: 0,
            "TOTAL QTY": 0,
          };
        }
        sumasDisponibles[itemCode].CTNS += item.CTNS || 0;
        sumasDisponibles[itemCode]["TOTAL QTY"] += item["TOTAL QTY"] || 0;
      });
    }
  });

  // Obtener las importaciones finalizadas
  const dbItems = await db
    .collection("importacionDet")
    .where("bl", "==", bl)
    .where("estado", "==", "F")
    .get();

  dbItems.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.detalle)) {
      data.detalle.forEach((item) => {
        const itemCode = item["Item Code"];
        if (!sumasDisponibles[itemCode]) {
          sumasDisponibles[itemCode] = {
            CTNS: item.CTNS || 0,
            "TOTAL QTY": item["TOTAL QTY"] || 0,
          };
        } else {
          sumasDisponibles[itemCode].CTNS = Math.max(
            0,
            sumasDisponibles[itemCode].CTNS - (item.CTNS || 0)
          );
          sumasDisponibles[itemCode]["TOTAL QTY"] = Math.max(
            0,
            sumasDisponibles[itemCode]["TOTAL QTY"] - (item["TOTAL QTY"] || 0)
          );
        }
      });
    }
  });

  return sumasDisponibles;
}

async function procesarExcel(excelData) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelData);

  const worksheet = workbook.getWorksheet(1);
  const resultados = [];

  const headers = worksheet.getRow(1).values.slice(1);

  if (
    headers[0].toUpperCase() === "ITEM CODE" &&
    headers[1].toUpperCase() === "FAMILY CODE" &&
    headers[2].toUpperCase() === "DESCRIPCION" &&
    headers[3].toUpperCase() === "CTNS" &&
    headers[4].toUpperCase() === "QTY PZA X CAJA" &&
    headers[5].toUpperCase() === "TOTAL QTY" &&
    headers[6].toUpperCase() === "SUCURSAL"
  ) {
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const [Item, family, description, ctns, qtyxpza, total, sucursal] =
        row.values.slice(1);

      const Registro = {
        CTNS: parseInt(ctns) || 0,
        Descripcion: description?.toString().trim() || "",
        "Family Code": family?.toString().trim() || "",
        "Item Code": Item?.toString().trim(),
        "QTY PZA X CAJA": parseInt(qtyxpza) || 0,
        "TOTAL QTY": (parseInt(ctns) || 0) * (parseInt(qtyxpza) || 0),
        Sucursal: sucursal?.toString().trim(),
      };

      if (!Registro["Item Code"]) {
        break;
      }
      resultados.push(Registro);
    }
  } else {
    throw new Error("Formato de Excel diferente a la plantilla, validar");
  }

  return resultados;
}

function validarDatosExcel(resultadosExcel, sumasDisponibles) {
  const itemsValidos = [];
  const itemsInvalidos = [];

  resultadosExcel.forEach((item) => {
    const itemCode = item["Item Code"];
    const disponible = sumasDisponibles[itemCode] || {
      CTNS: 0,
      "TOTAL QTY": 0,
    };

    if (
      item.CTNS <= disponible.CTNS &&
      item["TOTAL QTY"] <= disponible["TOTAL QTY"]
    ) {
      itemsValidos.push(item);
      // Actualizar las cantidades disponibles
      disponible.CTNS -= item.CTNS;
      disponible["TOTAL QTY"] -= item["TOTAL QTY"];
    } else {
      itemsInvalidos.push({
        ...item,
        razon: "Excede la cantidad disponible",
        disponible: { ...disponible },
      });
    }
  });

  return { itemsValidos, itemsInvalidos };
}
