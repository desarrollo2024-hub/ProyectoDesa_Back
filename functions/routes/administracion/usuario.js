const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos, validarJWT } = require("../../middlewares");
const {
  validaUnaPalabraSinEspacios,
  validaNoExistaDatoDuplicado,
  validaNoExistaDato,
} = require("../../helpers/validacionesDB");
const {
  nuevoRegistro,
  consultarRegistros,
  modificarRegistro,
  eliminarRegistro,
  consultaRegistroID,
  cambiarContrasena,
} = require("../../controllers/administracion/usuario");

const router = Router();
const collection = "usuario";
const nombreCampo = "usuario";

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe", req.body);
  next();
});

//Insertar
router.post(
  "/",
  [
    validarJWT,
    check("nombre", "Por favor envie el nombre").not().isEmpty(),
    check("usuario", "Por favor envie nombre de usuario").not().isEmpty(),
    check("rol", "Por favor envie el rol").not().isEmpty(),
    check(nombreCampo).custom(async (usuario, { req }) => {
      await validaNoExistaDatoDuplicado(
        collection,
        nombreCampo,
        usuario,
        req.body
      );
    }),
    check("correo")
      .isEmail()
      .withMessage("El correo no es válido")
      .custom(async (correo) => {
        await validaNoExistaDatoDuplicado(collection, "correo", correo);
      }),
    check(nombreCampo).custom(async (usuario) => {
      await validaUnaPalabraSinEspacios(usuario, nombreCampo);
    }),
    validarCampos,
  ],
  nuevoRegistro
);

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

//Listar por ID
router.get(
  "/:id",
  [
    validarJWT,
    check("id", "Por favor envie el id").not().isEmpty(),
    validarCampos,
  ],
  consultaRegistroID
);

//Modificar
router.put(
  "/",
  [
    validarJWT,
    check("id", "Por favor envie el id").not().isEmpty(),
    check("nombre", "Por favor envie el nombre").not().isEmpty(),
    check("usuario", "Por favor envie nombre de usuario").not().isEmpty(),
    check("correo")
      .isEmail()
      .withMessage("El correo no es válido")
      .custom(async (correo, { req }) => {
        await validaNoExistaDato(collection, "correo", correo, req.body);
      }),
    validarCampos,
  ],
  modificarRegistro
);

//Cambio de contrasela
router.put(
  "/cambiarContrasena/",
  [
    validarJWT, // Middleware para validar el token JWT enviado en la petición
    check("claveActual", "Por favor envie la claveActual").not().isEmpty(),
    check("claveNuevaRepetida", "Por favor envie la claveNuevaRepetida")
      .not()
      .isEmpty(),
    check("claveNueva", "Por favor envie la claveNueva").not().isEmpty(),
    validarCampos, // Middleware para validar que los campos hayan sido ingresados correctamente
  ],
  cambiarContrasena
); // Ruta para modificar un usuario existente

//Eliminar
router.delete(
  "/:id",
  [
    validarJWT,
    check("id", "Por favor envie el id").not().isEmpty(),
    validarCampos,
  ],
  eliminarRegistro
);

router.meta = {
  Modulo: "[Configuración]",
  IconoModulo: "[bi bi-gear-fill]",
  Titulo: "Usuarios",
  Descripcion: "Administración de Usuarios",
  Ruta: "/menu/Usuarios",
  Icono: "bi bi-people-fill",
  Orden: "[1,2]",
};

module.exports = router;
