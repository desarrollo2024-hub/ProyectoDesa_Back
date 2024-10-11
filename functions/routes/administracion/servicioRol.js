const path = require("path");
const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos, validarJWT } = require("../../middlewares");
const {
  consultarRegistrosProInd,
  nuevoRegistroAccordion,
} = require("../../controllers/administracion/servicioRol");

const router = Router(); // Crea una instancia de la clase Router

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
    check("servicios", "Por favor envie los servicios ").not().isEmpty(),
    check("rol", "Por favor envie el id del rol").not().isEmpty(),
    validarCampos,
  ],
  nuevoRegistroAccordion
);

//Acordeon
router.get("/", [validarJWT], consultarRegistrosProInd);
router.get("/:busqueda", [validarJWT], consultarRegistrosProInd);

router.meta = {
  Modulo: "[Configuración,Acceso]",
  IconoModulo: "[bi bi-gear-fill,bi bi-ui-checks-grid]",
  Titulo: "Servicio Rol",
  Descripcion: "Administracion de los servicios con roles",
  Ruta: "/menu/ServicioRol",
  Icono: "bi bi-list-check",
  Orden: "[1,1,2]",
};

module.exports = router; // Exporta el router para ser utilizado por la aplicación principal.
