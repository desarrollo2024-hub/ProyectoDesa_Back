const { Router } = require("express"); // Importa la clase Router del módulo express para crear nuevas rutas
const { check } = require("express-validator");
const {
  PlantillasXLS,
  cargaXLSDetImpor,
  descargaXLSDetImpor,
  cargaXLSDespacho,
  descargaXLSDespacho,
  descargaPlantillaXLSDespacho,
} = require("../../controllers/archivos/upDownloadExcel"); // Importa las funciones del controlador usuarios.js para procesar las peticiones HTTP
const { validarCampos, validarJWT } = require("../../middlewares"); // Importa los middlewares para validar campos y tokens JWT

const router = Router(); // Crea una instancia de la clase Router

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe: ", req.body, "parametros ", req.params);
  next();
});

router.get(
  "/descargaFileDespacho/Excel/:id",
  [validarJWT],
  check("id", "Por favor envie el id correspondiente").not().isEmpty(),
  descargaXLSDespacho
);

router.post(
  "/cargaFileDespacho/Excel/:id",
  [validarJWT],
  check("id", "Por favor envie el id correspondiente").not().isEmpty(),
  cargaXLSDespacho
);

router.get(
  "/descargaPlantillaDespacho/Excel/:id",
  [
    validarJWT,
    check("id", "Por favor envie el id correspondiente").not().isEmpty(),
    validarCampos,
  ],
  descargaPlantillaXLSDespacho
);

router.get(
  "/descargaFileDetImpo/Excel/:id",
  [validarJWT],
  check("id", "Por favor envie el id correspondiente").not().isEmpty(),
  descargaXLSDetImpor
);

router.post(
  "/cargaFileDetImpor/Excel/:id",
  [validarJWT],
  check("id", "Por favor envie el id correspondiente").not().isEmpty(),
  cargaXLSDetImpor
);

//obtener las plantillas en general por nombre
router.get(
  "/recuperaArchivo/Excel/:nombreArchivo",
  [validarJWT, validarCampos],
  PlantillasXLS
);

module.exports = router; // Exporta el router para ser utilizado por la aplicación principal.
