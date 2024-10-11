const jwt = require("jsonwebtoken");
const config = require("../config"); // Importa el archivo de configuración

const generarJWT = (id = "") => {
  return new Promise((resolve, reject) => {
    const payload = { id };

    jwt.sign(
      payload,
      config.PRIVATEKEY,
      {
        expiresIn: "12h",
      },
      (err, token) => {
        if (err) {
          reject("Error al generar el token");
        } else {
          resolve(token);
        }
      }
    );
  });
};

const verificarToken = (token) => {
  return jwt.verify(token, secret);
};

module.exports = {
  generarJWT,
  verificarToken,
};
