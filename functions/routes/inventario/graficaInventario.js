const { Router } = require("express");
const { validarJWT } = require("../../middlewares");
const {
  consultarRegistros,
} = require("../../controllers/inventario/graficaInventario");

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
  Titulo: "Gráficas Inventario",
  Descripcion: "Muestra Gráficas Inventarios",
  Ruta: "/menu/GraficaInventario",
  Icono: "bi bi-pie-chart-fill",
  Orden: "[4,3]",
};

module.exports = router;
