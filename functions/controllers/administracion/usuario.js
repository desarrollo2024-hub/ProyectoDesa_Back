const { db } = require("../../connectors/dbconnect");
const bcryptjs = require("bcryptjs");
const { procesaCRUD, formatDateDB } = require("../../helpers/procesaCRUD");
const { passTemp } = require("../../helpers/generaDatosUsuario");
const { nuevoUsuario } = require("../../helpers/htmlTemplates");
const { enviarCorreo } = require("../../helpers/generarCorreo");
const moment = require("moment");

const collection = "usuario";
const campoCollection = "usuario";
const formatDate = "YYYY-MM-DD HH:mm:ss";

//CREATE O INSERT
exports.nuevoRegistro = async (req, res) => {
  try {
    //Generar clave Temporal
    const contrasena = await passTemp();

    //Generar y encriptar contraseña
    const contraseñaEncriptada = bcryptjs.hashSync(
      contrasena,
      bcryptjs.genSaltSync()
    );

    const jsonInitialC = {
      usuario: req.body.usuario.toUpperCase(),
      clave: contraseñaEncriptada,
      rol: req.body.rol,
      nombre: req.body.nombre,
      apellidos: req.body.apellidos,
      dpi: req.body.dpi,
      puesto: req.body.puesto,
      correo: req.body.correo.toLowerCase(),
      fechaCreacion: moment(),
      usuarioCrea: req.usuario.usuario,
      estado: "A",
    };

    // Filtrar los campos vacíos o nulos
    const jsonInsert = Object.entries(jsonInitialC).reduce(
      (acc, [key, value]) => {
        if (
          value?.toString() &&
          value?.toString() != "" &&
          value?.toString() != "undefined"
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    //Enviar correo
    const asunto = "Bienvenido, Credenciales de acceso";
    const nombreCompleto = `${req.body.nombre} ${req.body.apellidos}`;
    const html = nuevoUsuario(nombreCompleto, jsonInsert.usuario, contrasena);

    // Enviar correo
    enviarCorreo(jsonInsert.correo, asunto, html);

    // Crear un nuevo documento en la colección
    const docRef = await db.collection(collection).add(jsonInsert);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${jsonInsert[campoCollection]} creado exitosamente`,
      id: docRef.id, // Devolver el ID del documento creado
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//READ OR CONSULT
exports.consultarRegistros = async (req, res) => {
  try {
    let { filtro } = req.params;
    let textoFiltro = filtro;

    let dbConsulta = [{}];
    let filas = [];
    let columnas = [];

    if (filtro) {
      filtro = filtro ? filtro.split("") : [];

      dbConsulta = await db
        .collection(collection)
        .where("estado", "in", filtro)
        .where("usuario", "!=", req.usuario.usuario)
        .get();

      //Retorna el nuevo json que se pintara en la tabla
      filas = dbConsulta?.docs.map((data) => {
        const element = data.data();
        let fila = {
          ID: data.id,
          USUARIO: element.usuario,
          NOMBRE: `${element.nombre} ${element.apellidos}`,
          DPI: element.dpi,
          PUESTO: element.puesto,
          CORREO: element.correo,
          CONECTADO: element.conectado == 1 ? "SI" : "NO",
          ULTIMA_SESIÓN: formatDateDB(element.fechaUltimaSesion, formatDate),
          USUARIO_CREACION: element.usuarioCrea,
          FECHA_CREACION: formatDateDB(element.fechaCreacion, formatDate),
          ESTADO:
            element.estado == "A"
              ? "Activo"
              : element.estado == "B"
              ? "Bloqueado"
              : element.estado == "I"
              ? "Inactivo"
              : "Eliminado",
        };

        if (textoFiltro.includes("N")) {
          fila = {
            ...fila,
            USUARIO_ELIMINO: element.usuarioElimina,
            FECHA_ELIMINACION: formatDateDB(
              element.fechaEliminacion,
              formatDate
            ),
          };
        }

        return fila;
      });
    }

    //Retornar filas vacias para armar las columnas
    if (dbConsulta.empty) {
      filas = [
        {
          ID: "",
          USUARIO: "",
          NOMBRE: "",
          FEHA_NACIMIENTO: "",
          DPI: "",
          PUESTO: "",
          CORREO: "",
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

    //Arma valores para retornar en los combobox en el front
    const conectado = [
      { value: true, descripcion: "SI" },
      { value: false, descripcion: "NO" },
    ];

    const estado = [
      { value: "A", descripcion: "Activo" },
      { value: "B", descripcion: "Bloqueado" },
    ];

    //Roles y estados

    const dbRolesSnap = await db
      .collection("rol")
      .where("estado", "!=", "N")
      .get();

    const dbRoles = dbRolesSnap.docs.map((doc) => ({
      value: doc.data().rol,
      descripcion: `${doc.data().rol} - ${doc.data().descripcion}`,
    }));

    let valoresSelectBox = {
      rol: dbRoles || [],
      conectado,
      estado,
    };

    const CRUD = await procesaCRUD(CRUDs);

    const json = {
      tabla: {
        data: filas,
        columnas: columnas,
      },
      valoresSelectBox,
      CRUD,
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

//UPDATE OR MODIFY
exports.modificarRegistro = async (req, res) => {
  try {
    const { id } = req.body;
    const dbModifica = await db.collection(collection).doc(id).get();
    if (!dbModifica.exists || dbModifica.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado o no disponible para modificación`,
      });
    }

    const jsonInitial = {
      rol: req.body.rol,
      nombre: req.body.nombre,
      apellidos: req.body.apellidos,
      dpi: req.body.dpi,
      puesto: req.body.puesto,
      correo: req.body.correo.toLowerCase(),
      conectado: req.body.conectado,
      estado: req.body.estado,
      fechaModificacion: moment(),
    };

    // Filtrar los campos vacíos o nulos
    const jsonUpdate = Object.entries(jsonInitial).reduce(
      (acc, [key, value]) => {
        if (
          value?.toString() &&
          value?.toString() != "" &&
          value?.toString() != "undefined"
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    // Actualizar el documento
    await dbModifica.ref.update(jsonUpdate);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${
        dbModifica.data()[campoCollection]
      } modificado exitosamente`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//DELETE OR ELIMINATE
exports.eliminarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const dbElimina = await db.collection(collection).doc(id).get();
    if (!dbElimina.exists || dbElimina.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado o no disponible para modificación`,
      });
    }

    const jsonDelete = {
      estado: "N",
      fechaEliminacion: moment(),
      usuarioElimina: req.usuario.usuario,
    };

    //Eliminar Registro
    await dbElimina.ref.update(jsonDelete);

    return res.status(200).json({
      codigo: 200,
      mensaje: `Registro ${
        dbElimina.data()[campoCollection]
      } eliminado exitosamente`,
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
exports.consultaRegistroID = async (req, res) => {
  try {
    let { id } = req.params;

    const dbConsultaID = await db.collection(collection).doc(id).get();
    if (!dbConsultaID.exists || dbConsultaID.data().estado == "N") {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Registro no encontrado, favor recargue la página`,
      });
    }

    const dbConsultaIDData = dbConsultaID.data();
    // Armado de la respuesta
    const json = {
      id: dbConsultaID.id,
      usuario: dbConsultaIDData.usuario,
      rol: dbConsultaIDData.rol,
      nombre: dbConsultaIDData.nombre,
      apellidos: dbConsultaIDData.apellidos,
      dpi: dbConsultaIDData.dpi,
      puesto: dbConsultaIDData.puesto,
      correo: dbConsultaIDData.correo,
      conectado: dbConsultaIDData.conectado || 0,
      estado: dbConsultaIDData.estado,
    };

    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosa",
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

exports.cambiarContrasena = async (req, res) => {
  try {
    const token = req.header("x-token");
    //Extraer el usuario y clave de los parametros enviados
    const { Usuario, claveActual, claveNuevaRepetida, claveNueva } = req.body;

    const dbModificaClave = await db
      .collection(collection)
      .doc(req.usuario.id)
      .get();

    if (
      !dbModificaClave.exists ||
      dbModificaClave.data().estado === "N" ||
      Usuario != req.usuario.usuario ||
      dbModificaClave.data().conectado != true
    ) {
      return res.status(400).json({
        codigo: 400,
        mensaje: `Usuario no encontrado o desconectado, recargue la sesion",`,
      });
    }

    //verificar contraseña
    const validPass = bcryptjs.compareSync(
      claveActual,
      dbModificaClave.data().clave
    );
    if (!validPass) {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Contraseña incorrecta",
      });
    }

    //Validacion de contraseña
    if (claveNueva == claveActual) {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Debe cambiar la contraseña, contraseña ya utilizada",
      });
    }

    if (claveNueva != claveNuevaRepetida) {
      return res.status(400).json({
        codigo: 401,
        mensaje: "Las contraseñas nuevas no son iguales",
      });
    }

    //encriptar contraseña
    const salt = bcryptjs.genSaltSync();
    const contraseñaEncriptada = bcryptjs.hashSync(claveNueva, salt);
    await dbModificaClave.ref.update({ clave: contraseñaEncriptada });

    return res.status(201).json({
      codigo: 200,
      mensaje: `Contraseña cambiada exitosamente`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

const CRUDs = [
  {
    elemento: "input",
    type: "text",
    name: "usuario",
    id_input: "usuario",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: true,
    titulo: "Usuario",
    tamanio: 30,
    obligatorio: true,
    placeholder: "Ingrese Usuario",
    className: "col-md-9",
    CRUD: {
      create: { disabled: false },
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "nombre",
    id_input: "nombre",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Nombre",
    tamanio: 50,
    obligatorio: true,
    placeholder: "Ingrese Nombre",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "apellidos",
    id_input: "apellidos",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Apellido",
    tamanio: 50,
    obligatorio: true,
    placeholder: "Ingrese Apellido",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "puesto",
    id_input: "puesto",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Puesto",
    tamanio: 30,
    obligatorio: false,
    placeholder: "Ingrese Puesto",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "number",
    name: "dpi",
    id_input: "dpi",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "DPI",
    tamanio: 13,
    obligatorio: false,
    placeholder: "Ingrese DPI",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "input",
    type: "text",
    name: "correo",
    id_input: "correo",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Correo",
    tamanio: 100,
    obligatorio: true,
    placeholder: "Ingrese Correo",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "select",
    type: "select",
    name: "rol",
    id_input: "rol",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Rol",
    tamanio: 5,
    obligatorio: true,
    placeholder: "Seleccione Rol",
    className: "col-md-9",
    CRUD: {
      create: {},
      read: {},
      update: {},
    },
  },
  {
    elemento: "select",
    type: "select",
    name: "conectado",
    id_input: "conectado",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Conectado",
    tamanio: 2,
    obligatorio: true,
    placeholder: "Seleccione",
    className: "col-md-9",
    CRUD: {
      read: {},
      update: {},
    },
  },
  {
    elemento: "select",
    type: "select",
    name: "estado",
    id_input: "estado",
    classNameLabel: "col-sm-3 col-form-label",
    disabled: false,
    titulo: "Estado",
    tamanio: 2,
    obligatorio: true,
    placeholder: "Seleccione",
    className: "col-md-9",
    CRUD: {
      read: {},
      update: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea eliminar el usuario",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      delete: {},
    },
  },
  {
    elemento: "label",
    titulo: "¿Esta seguro que desea restablecer la contraseña del usuario",
    className: "col-md-12 text-center mt-1 mb-4",
    CRUD: {
      reset: {},
    },
  },
];
