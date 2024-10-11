const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos, validarJWT } = require("../../middlewares");
const {
  nuevoRegistro,
  consultarRegistros,
  modificarRegistro,
  eliminarRegistro,
  consultarRegPorID,
  cambiarEtapa,
} = require("../../controllers/despacho/despacho");

const router = Router();
const collection = "despacho";
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
    validarCampos,
  ],
  nuevoRegistro
);

//Listar
router.get("/filtro/:filtro", [validarJWT], consultarRegistros);

//Listar por ID
router.get(
  "/:id/?:opcion",
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
  Modulo: "[Despacho]",
  IconoModulo: "[bi bi-shop]",
  Titulo: "Despacho",
  Descripcion: "Administración de los articulos de los despachos",
  Ruta: "/menu/Despacho",
  Icono: "bi bi-cart-plus",
  Orden: "[3,2]",
};

module.exports = router;
