const { db } = require("../connectors/dbconnect");

exports.validaUnaPalabraSinEspacios = async (valor, nombreCampo) => {
  //Valida que solo se reciba una palabra sin espacios en blanco
  if (/\s/g.test(valor)) {
    throw new Error(`El ${nombreCampo} no puede contener espacios en blanco`);
  }
};

exports.validaNoExistaDatoDuplicado = async (
  tabla,
  columna,
  valor,
  reqBody = {}
) => {
  //Valida que el campo no esté vacio
  if (!valor || valor.trim().length === 0) {
    throw new Error(`El campo ${columna} no puede estar vacío`);
  }

  const valorLower = valor.toLowerCase();
  const valorUpper = valor.toUpperCase();
  const snapshot = await db
    .collection(tabla)
    .where(columna, "in", [valorLower, valorUpper, valor])
    .where("estado", "==", "A")
    .get();

  if (!snapshot.empty) {
    throw new Error(`El ${columna}: ${valor} ya se encuentra registrado`);
  }
};

/*Valida que los datos no existan o sean unicos al modificar Por Id*/
exports.validaNoExistaDato = async (tabla, columna, valor, reqBody = {}) => {
  //Valida que el campo no esté vacio
  if (!valor || valor.trim().length === 0) {
    throw new Error(`El campo ${columna} no puede estar vacío`);
  }

  const valorLower = valor.toLowerCase();
  const valorUpper = valor.toUpperCase();

  const snapshot = await db
    .collection(tabla)
    .where(columna, "in", [valorLower, valorUpper, valor])
    .where("estado", "==", "A")
    .get();

  const documentosConflicto = snapshot.docs.filter(
    (doc) => doc.id !== reqBody.id
  );

  if (documentosConflicto.length > 0) {
    throw new Error(`El ${columna}: ${valor} ya se encuentra registrado`);
  }
};

/*Valida que los datos no existan o sean unicos*/
exports.validaNoExistaDatoDuplicadoDoble = async (
  tabla,
  columna1,
  valor1,
  columna2,
  valor2
) => {
  //Valida que el campo no esté vacio
  if (!valor1 || valor1.trim().length === 0) {
    throw new Error(`El campo ${columna1} no puede estar vacío`);
  }

  if (!valor2 || valor2.trim().length === 0) {
    throw new Error(`El campo ${columna2} no puede estar vacío`);
  }

  const valorLower1 = valor1.toLowerCase();
  const valorUpper1 = valor1.toUpperCase();
  const valorLower2 = valor2.toLowerCase();
  const valorUpper2 = valor2.toUpperCase();

  const snapshot = await db
    .collection(tabla)
    .where(columna1, "in", [valorLower1, valorUpper1, valor1])
    .where(columna2, "in", [valorLower2, valorUpper2, valor2])
    .where("estado", "==", "A")
    .get();

  if (!snapshot.empty) {
    throw new Error(
      `El ${columna1}: ${valor1} y el ${columna2}: ${valor2} ya se encuentra registrado`
    );
  }
};
