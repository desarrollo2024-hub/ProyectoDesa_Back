const { Router } = require("express");
const { validarJWT } = require("../../middlewares");
const {
  consultarRegistros,
} = require("../../controllers/importaciones/graficaImpEnc");

const router = Router();

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe", req.body);
  next();
});

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

router.meta = {
  Modulo: "[Importaciones]",
  IconoModulo: "[bi bi-truck]",
  Titulo: "Gráficas Importación",
  Descripcion: "Muestra de gráficas",
  Ruta: "/menu/GráficaEncImp",
  Icono: "bi bi-bar-chart-fill",
  Orden: "[2,3]",
};

module.exports = router;
