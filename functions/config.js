const functions = require("firebase-functions");

const getConfig = () => {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Estamos en el emulador de Firebase Functions
    return functions.config();
  } else if (process.env.NODE_ENV === "development") {
    // En desarrollo, usa .runtimeconfig.json
    return require("./.runtimeconfig.json");
  } else {
    return functions.config();
  }
};

const config = getConfig();

// Función para reconstruir el array de URLs autorizadas
const getUrlAutorizadas = () => {
  const urlautorizadas = config.urlautorizadas;
  return Object.values(urlautorizadas).filter((url) => url); // Filtra valores vacíos
};

module.exports = {
  // Configuración APP
  PORT: config.app.port,
  PRIVATEKEY: config.app.privatekey,

  // Configuración Correo
  EMAIL_CORREO: config.email.correo,
  EMAIL_CONTRASENA: config.email.contrasena,
  EMAIL_HOST: config.email.host,
  EMAIL_PORT: config.email.port,
  URL_AUTORIZADAS: getUrlAutorizadas(),
};
