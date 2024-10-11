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
  consultarRegPorID,
  cambiarEtapa,
} = require("../../controllers/importaciones/importacion");

const router = Router();
const collection = "importacionEnc";
const nombreCampo = "bl";

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
    check(nombreCampo, "Por favor envie el codigo bl").not().isEmpty(),
    check(nombreCampo).custom(async (infoCampo, { req }) => {
      await validaNoExistaDatoDuplicado(
        collection,
        nombreCampo,
        infoCampo,
        req.body
      );
    }),
    check(nombreCampo).custom(async (infoCampo) => {
      await validaUnaPalabraSinEspacios(infoCampo, nombreCampo);
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
    validarCampos,
  ],
  modificarRegistro
);

//Cambio de Etapa
router.put(
  "/cambiarEtapa/:id",
  [
    validarJWT, // Middleware para validar el token JWT enviado en la petición
    check("id", "Por favor envie el id del registro").not().isEmpty(),
    validarCampos, // Middleware para validar que los campos hayan sido ingresados correctamente
  ],
  cambiarEtapa
); // Ruta para modificar un usuario existente

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
  Titulo: "Importación",
  Descripcion: "Administración de Importaciones",
  Ruta: "/menu/Importacion",
  Icono: "bi bi-box-seam-fill",
  Orden: "[2,2]",
};

module.exports = router;