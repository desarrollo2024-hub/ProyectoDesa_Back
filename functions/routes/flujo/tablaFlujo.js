const { Router } = require("express");
const { check } = require("express-validator");
const { validarJWT } = require("../../middlewares");
const { consultarRegistros } = require("../../controllers/flujo/tablaFlujo");

const router = Router();

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe", req.body);
  next();
});

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

router.meta = {
  Modulo: "[Seguimiento]",
  IconoModulo: "[bi bi-bar-chart-steps]",
  Titulo: "Seguimiento",
  Descripcion: "Seguimiento de Importaciones",
  Ruta: "/menu/Seguimiento",
  Icono: "bi bi-bar-chart-steps",
  Orden: "[5]",
};

module.exports = router;
