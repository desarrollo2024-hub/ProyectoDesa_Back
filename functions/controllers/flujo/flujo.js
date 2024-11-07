const { db } = require("../../connectors/dbconnect");
const moment = require("moment");

const collection = "importacionFlujo";

const registraFlujo = async (bl, usuario, etapa, cliente) => {
  console.log("bl, usuario, etapa, cliente", bl, usuario, etapa, cliente);
  try {
    const jsonInsert = {
      bl,
      usuario,
      etapa,
      cliente,
      fecha: moment(),
    };

    const dbInserta = await db.collection(collection).add(jsonInsert);
    return dbInserta;
  } catch (error) {
    console.log(error);
    throw new Error(`Error al registrar en la bitácora: ${error}`);
  }
};

module.exports = { registraFlujo };
