const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos, validarJWT } = require("../../middlewares");
const {
  validaUnaPalabraSinEspacios,
  validaNoExistaDatoDuplicado,
} = require("../../helpers/validacionesDB");
const {
  nuevoRegistro,
  consultarRegistros,
  modificarRegistro,
  eliminarRegistro,
  consultaRegistroID,
} = require("../../controllers/administracion/rol");

const router = Router();
const collection = "rol";
const nombreCampo = "rol";

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
    check("rol", "Por favor envie el codigo rol").not().isEmpty(),
    check("descripcion", "Por favor envie la descripcion").not().isEmpty(),
    check("rol").custom(async (codigoRol, { req }) => {
      await validaNoExistaDatoDuplicado(
        collection,
        nombreCampo,
        codigoRol,
        req.body
      );
    }),
    check("rol").custom(async (codigoRol) => {
      await validaUnaPalabraSinEspacios(codigoRol, nombreCampo);
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
    check("id", "Por favor envie el id rol").not().isEmpty(),
    validarCampos,
  ],
  consultaRegistroID
);

//Modificar
router.put(
  "/",
  [
    validarJWT,
    check("id", "Por favor envie el id rol").not().isEmpty(),
    check("descripcion", "Por favor envie la descripcion").not().isEmpty(),
    validarCampos,
  ],
  modificarRegistro
);

//Eliminar
router.delete(
  "/:id",
  [
    validarJWT,
    check("id", "Por favor envie el id rol").not().isEmpty(),
    validarCampos,
  ],
  eliminarRegistro
);

router.meta = {
  Modulo: "[Configuración,Acceso]",
  IconoModulo: "[bi bi-gear-fill,bi bi-ui-checks-grid]",
  Titulo: "Roles",
  Descripcion: "Administración de Roles",
  Ruta: "/menu/Rol",
  Icono: "bi bi-border-width",
  Orden: "[1,1,1]",
};

module.exports = router;
