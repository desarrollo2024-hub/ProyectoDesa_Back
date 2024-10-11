const { Router } = require("express");
const { check } = require("express-validator");
const { validarJWT } = require("../../middlewares");
const {
  consultarRegistros,
  consultarRegPorID,
} = require("../../controllers/inventario/inventario");

const router = Router();

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log("recibe", req.body);
  next();
});

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

//Listar por ID
router.get(
  "/:id/?:opcion",
  [
    validarJWT,
    check("id", "Por favor envie el id del registro").not().isEmpty(),
  ],
  consultarRegPorID
);

router.meta = {
  Modulo: "[Inventario]",
  IconoModulo: "[bi bi-journals]",
  Titulo: "Inventario",
  Descripcion: "Muestra Inventarios",
  Ruta: "/menu/Inventario",
  Icono: "bi bi-journal-text",
  Orden: "[4,2]",
};

module.exports = router;
