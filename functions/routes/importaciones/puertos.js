const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos, validarJWT } = require("../../middlewares");
const { validaNoExistaDatoDuplicado } = require("../../helpers/validacionesDB");
const {
  nuevoRegistro,
  consultarRegistros,
  modificarRegistro,
  eliminarRegistro,
  consultarRegPorID,
} = require("../../controllers/importaciones/puertos");

const router = Router();
const collection = "puerto";
const nombreCampo = "nombre";

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
    check(nombreCampo, "Por favor envie el nombre").not().isEmpty(),
    check("descripcion", "Por favor envie la descripcion").not().isEmpty(),
    check(nombreCampo).custom(async (infoCampo, { req }) => {
      await validaNoExistaDatoDuplicado(
        collection,
        nombreCampo,
        infoCampo,
        req.body
      );
    }),
    //check(nombreCampo).custom(async (infoCampo) => {
    //  await validaUnaPalabraSinEspacios(infoCampo, nombreCampo);
    //}),
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
    check("id", "Por favor envie el id del registro").not().isEmpty(),
    validarCampos,
  ],
  consultarRegPorID
);

//Modificar
router.put(
  "/",
  [
    validarJWT,
    check("id", "Por favor envie el id del registro").not().isEmpty(),
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
    check("id", "Por favor envie el id del registro").not().isEmpty(),
    validarCampos,
  ],
  eliminarRegistro
);

router.meta = {
  Modulo: "[Importaciones]",
  IconoModulo: "[bi bi-truck]",
  Titulo: "Puertos",
  Descripcion: "Administración de Puertos",
  Ruta: "/menu/Puertos",
  Icono: "bi bi-pin-map-fill",
  Orden: "[2,1]",
};

module.exports = router;
