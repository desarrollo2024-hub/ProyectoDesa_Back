const { Router } = require("express");
const { validarJWT } = require("../../middlewares");
const { consultarRegistros } = require("../../controllers/inventario/stock");

const router = Router();

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe", req.body);
  next();
});

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

router.meta = {
  Modulo: "[Inventario]",
  IconoModulo: "[bi bi-journals]",
  Titulo: "Stock",
  Descripcion: "Muestra Stock",
  Ruta: "/menu/Stock",
  Icono: "bi bi-journal-check",
  Orden: "[4,1]",
};

module.exports = router;
