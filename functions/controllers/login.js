const { db } = require("../connectors/dbconnect");
const config = require("../config");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generarJWT } = require("../helpers/generar-jwt");
const { enviarCorreo } = require("../helpers/generarCorreo");
const { reseteoClave } = require("../helpers/htmlTemplates");
const { formatDateDB } = require("../helpers/procesaCRUD");
const {
  obtenerRutasPorRol,
  passTemp,
} = require("../helpers/generaDatosUsuario");
const moment = require("moment");

const collection = "usuario";
const formatDate = "YYYY-MM-DD HH:mm:ss";

//Login del usuario
exports.loginPost = async (req, res) => {
  const { usuario, clave, tipoCone } = req.body; //Se extrae el usuario y clave de los parametros enviados
  try {
    //verificar el usuario no esté eliminado
    const dbUsuario = await db
      .collection(collection)
      .where("usuario", "==", usuario.toUpperCase())
      .where("estado", "in", ["A", "I", "B"])
      .get();

    //Valida el usuario exista
    if (dbUsuario.empty) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Usuario o contraseña inválida.",
      });
    }

    const usuarios = dbUsuario.docs[0]?.data();
    const idUsuario = dbUsuario.docs[0].id;

    //Valida el usuario exista
    if (!usuarios) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Usuario o contraseña inválida.",
      });
    }

    //Valida si el usuario esta activo
    if (usuarios.estado == "I") {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Usuario inactivo.",
      });
    } else if (usuarios.estado == "B") {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Usuario bloqueado.",
      });
    }

    //verificar contraseña
    const validPass = bcryptjs.compareSync(clave, usuarios.clave);
    if (!validPass) {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Usuario o contraseña inválida.",
      });
    }

    //Valida que el usuario no esté conectado
    if (!tipoCone) {
      if (usuarios.conectado == 1 || usuarios.conectado == true) {
        return res.status(400).json({
          codigo: 403,
          mensaje: "Usuario conectado",
        });
      }
    }

    //Obtiene todas las rutas a las que el usuario tiene acceso
    const rutas = await obtenerRutasPorRol(usuarios.rol);
    if (!rutas) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Rutas no encontradas",
      });
    }
    //Generar JWT
    const token = await generarJWT(idUsuario);
    const fechaUltConexion = formatDateDB(
      usuarios.fechaUltimaSesion,
      formatDate
    );

    const userRef = db.collection(collection).doc(idUsuario);
    await userRef.update({
      fechaUltimaSesion: moment(),
      conectado: true,
      terminal: token,
    });

    return res.status(200).json({
      codigo: 200,
      usuario: usuario.toUpperCase(),
      nombre: `${usuarios.nombre} ${usuarios.apellidos}`,
      estado: usuarios.estado,
      fechaUltConexion: fechaUltConexion,
      fechaConexion: moment().format("YYYY-MM-DD HH:mm:ss"),
      token,
      rutas,
    });
  } catch (error) {
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error.message}`,
    });
  }
};

//Se utiliza con método POST con parametro
exports.recuperaSesion = async (req, res) => {
  try {
    const token = req.header("x-token");
    if (!token) {
      return res.status(401).json({
        msg: "No se recibio ningun token",
      });
    }

    // Verificar JWT
    const { id } = jwt.verify(token, config.PRIVATEKEY);

    // Verificar el usuario que corresponde al uid
    const userDoc = await db.collection("usuario").doc(id).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Usuario no encontrado o desconectado, validar",
      });
    }

    const usuarios = userDoc.data();

    if (usuarios.estado === "N" || !usuarios.conectado) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Usuario no encontrado o desconectado, validar",
      });
    }

    // Obtiene todas las rutas a las que el usuario tiene acceso
    let rutas = await obtenerRutasPorRol(usuarios.rol);

    // Obtiene fecha actual
    const fechaUltConexion = formatDateDB(
      usuarios.fechaUltimaSesion,
      formatDate
    );

    res.json({
      codigo: 200,
      usuario: usuarios.usuario.toUpperCase(),
      nombre: `${usuarios.nombre} ${usuarios.apellidos}`,
      fechaUltConexion: fechaUltConexion,
      fechaConexion: moment().format("YYYY-MM-DD HH:mm:ss"),
      rutas,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error.message}`,
    });
  }
};
//Desconexión de usuarios
exports.logoutPost = async (req, res) => {
  const { usuario } = req.body;

  try {
    // Buscar el usuario en Firestore
    const snapshot = await db
      .collection(collection)
      .where("usuario", "==", usuario.toUpperCase())
      .where("estado", "==", "A")
      .where("conectado", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        codigo: 401,
        mensaje: "Usuario no encontrado o desconectado, validar",
      });
    }

    // Obtener el primer documento que coincide (debería ser único)
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Desconectar al usuario
    await userDoc.ref.update({
      conectado: false,
      terminal: "",
    });

    const fechaInicial = moment(userData.fechaUltimaSesion.toDate());
    const ahora = moment();
    const duracion = moment.duration(ahora.diff(fechaInicial));

    return res.status(200).json({
      codigo: 200,
      usuario: usuario.toUpperCase(),
      diasConectado: Math.floor(duracion.asDays()),
      horasConectado: duracion.hours(),
      minutosConectado: duracion.minutes(),
      segundosConectado: duracion.seconds(),
    });
  } catch (error) {
    console.error("Error en logoutPost:", error);
    res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error.message}`,
    });
  }
};

//Login del usuario
exports.recuperarContrasenaPost = async (req, res) => {
  const { emailUsuario } = req.body;

  try {
    const usuariosRef = db.collection(collection);
    let snapshot = await usuariosRef
      .where("estado", "in", ["A", "I", "B"])
      .where("usuario", "==", emailUsuario.toUpperCase())
      .get();

    if (snapshot.empty) {
      // Si no se encuentra por usuario, buscar por correo
      const snapshotCorreo = await usuariosRef
        .where("estado", "in", ["A", "I", "B"])
        .where("correo", "==", emailUsuario)
        .get();

      if (snapshotCorreo.empty) {
        return res.status(400).json({
          codigo: 400,
          mensaje: "Usuario / correo electrónico no encontrado, validar",
        });
      }
      snapshot = snapshotCorreo;
    }

    const userDoc = snapshot.docs[0];
    const usuarios = userDoc.data();

    if (usuarios.estado === "I") {
      return res.status(400).json({
        codigo: 401,
        mensaje:
          "No se puede restablecer la contraseña porque el usuario está inactivo",
      });
    } else if (usuarios.estado === "B") {
      return res.status(400).json({
        codigo: 401,
        mensaje:
          "No se puede restablecer la contraseña porque el usuario está Bloqueado",
      });
    }

    if (usuarios.conectado) {
      return res.status(400).json({
        codigo: 401,
        mensaje:
          "No se puede restablecer contraseña porque el usuario se encuentra conectado",
      });
    }

    const contrasenaTemporal = await passTemp();
    const contraseñaEncriptada = bcryptjs.hashSync(
      contrasenaTemporal,
      bcryptjs.genSaltSync()
    );

    const asunto = "Recuperación de contraseña";
    const nombreCompleto = `${usuarios.nombre} ${usuarios.apellidos}`;
    const html = reseteoClave(nombreCompleto, contrasenaTemporal);

    // Enviar correo
    enviarCorreo(usuarios.correo, asunto, html);

    await userDoc.ref.update({
      clave: contraseñaEncriptada,
      // Aquí puedes agregar cualquier otro campo que necesites actualizar
    });

    return res.json({
      codigo: 200,
      mensaje: `Contraseña restablecida exitosamente. Se envió un correo electrónico a ${usuarios.correo} con las instrucciones.`,
    });
  } catch (error) {
    console.error("Error en recuperarContrasenaPost:", error);
    res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error.message}`,
    });
  }
};

//Desconexión de usuarios por vencimiento token
exports.logoutNoToken = async (usuario) => {
  try {
    // Buscar el usuario por su nombre de usuario
    const usuariosRef = db.collection(collection);
    const snapshot = await usuariosRef
      .where("usuario", "==", usuario.toUpperCase())
      .get();

    if (snapshot.empty) {
      return {
        codigo: 401,
        mensaje: "Usuario no encontrado",
      };
    }

    // Asumimos que solo hay un usuario con ese nombre de usuario
    const userDoc = snapshot.docs[0];
    const usuarios = userDoc.data();

    // Valida que el usuario exista y esté conectado
    if (usuarios && usuarios.conectado) {
      const fechaActual = moment.utc(
        moment.tz("America/Guatemala").format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")
      );
      const fechaInicial = moment.utc(usuarios.fechaUltimaSesion);
      const duracion = moment.duration(fechaActual.diff(fechaInicial));

      // Actualizar el documento del usuario
      await userDoc.ref.update({
        conectado: false,
        terminal: "",
      });

      return {
        codigo: 200,
        usuario: usuario.toUpperCase(),
        diasConectado: Math.floor(duracion.asDays()),
        horasConectado: Math.floor(duracion.asHours() % 24),
        minutosConectado: Math.floor(duracion.asMinutes() % 60),
        segundosConectado: Math.floor(duracion.asSeconds() % 60),
      };
    } else {
      return {
        codigo: 400,
        mensaje: "Usuario no encontrado o no conectado",
      };
    }
  } catch (error) {
    console.log(
      `Error al cerrar sesión de usuario por token no válido: ${error}`
    );
    return {
      codigo: 500,
      mensaje: `Error: ${error.message}`,
    };
  }
};
