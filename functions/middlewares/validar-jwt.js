const jwt = require("jsonwebtoken");
const config = require("../config");
const { db } = require("../connectors/dbconnect");

exports.validarJWT = async (req, res, next) => {
  const token = req.header("x-token");
  const tieneToken = token !== null;

  if (!tieneToken) {
    return res.status(401).json({
      codigo: 451,
      mensaje: "No se recibio ningun token",
    });
  }

  try {
    let payload;
    try {
      payload = jwt.verify(token, config.PRIVATEKEY);
    } catch (err) {
      let pstDecode = jwt.decode(token);
      let id = pstDecode.id;

      const userDoc = await db.collection("usuario").doc(id).get();
      let duracion;

      if (userDoc.exists) {
        const userData = userDoc.data();
        if (
          userData.estado !== "N" &&
          userData.conectado &&
          userData.terminal === token
        ) {
          // Calcular el tiempo conectado
          const fechaActual = moment.utc(
            moment
              .tz("America/Guatemala")
              .format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")
          );
          const fechaInicial = moment.utc(userData.fechaUltimaSesion);
          duracion = moment.duration(fechaActual.diff(fechaInicial));

          // Actualizar el documento del usuario
          await userDoc.ref.update({
            conectado: false,
            terminal: "",
          });
        }
      }

      return res.status(401).json({
        codigo: 451,
        mensaje: "Sesion expirada",
        diasConectado: Math.floor(duracion.asDays()) || "",
        horasConectado: Math.floor(duracion.asHours() % 24) || "",
        minutosConectado: Math.floor(duracion.asMinutes() % 60) || "",
        segundosConectado: Math.floor(duracion.asSeconds() % 60) || "",
      });
    }

    const userDoc = await db.collection("usuario").doc(payload.id).get();

    if (!userDoc.exists || userDoc.data().estado !== "A") {
      return res.status(401).json({
        codigo: 451,
        mensaje: "Usuario no existe o no se encuentra activo",
      });
    }

    const dbUsuario = userDoc.data();

    if (!dbUsuario.conectado) {
      return res.status(401).json({
        codigo: 451,
        mensaje: "Usuario no conectado",
      });
    }

    if (dbUsuario.terminal !== token) {
      return res.status(401).json({
        codigo: 451,
        mensaje: "Token no pertenece al conectado",
      });
    }

    const servicioRol = req.baseUrl.split("/").slice(-1).toString();
    const servicioTemp =
      servicioRol.charAt(0).toUpperCase() + servicioRol.slice(1);
    if (servicioTemp !== "login") {
      const servicioRolRef = await db
        .collection("servicioRol")
        .where("rol", "==", dbUsuario.rol)
        .where("estado", "==", "A")
        .get();

      let tieneAcceso = false;

      if (!servicioRolRef.empty) {
        tieneAcceso = true;
      }

      if (!tieneAcceso) {
        return res.status(401).json({
          codigo: 451,
          mensaje: "Usuario sin acceso al módulo solicitado",
        });
      }
    }

    req.usuario = { id: userDoc.id, ...dbUsuario };

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({
      msg: "Token no valido",
      error: err,
    });
  }
};
