const { Router } = require("express");
const { check } = require("express-validator");
const {
  loginPost,
  logoutPost,
  recuperaSesion,
  recuperarContrasenaPost,
  logoutNoToken,
} = require("../controllers/login");
const { validarCampos, validarJWT } = require("../middlewares");

const router = Router();

//Este segmento está temporal, para capturar lo que se recibe
router.use((req, res, next) => {
  console.log(req.body);
  next();
});

router.post(
  "/",
  [
    check("clave", "Debe enviar una contraseña").not().isEmpty(),
    check("usuario", "Debe enviar un usuario").not().isEmpty(),
    validarCampos,
  ],
  loginPost
);

//Recuperar datos de sesion en FrontEnd
router.get("/recuperarSesion", [validarJWT], recuperaSesion);

//Recuperar contrasena.
router.post(
  "/recuperarContrasena",
  [
    check("emailUsuario", "Debe enviar un correo electronico o usuario")
      .not()
      .isEmpty(),
    validarCampos,
  ],
  recuperarContrasenaPost
);

router.post(
  "/:usuario",
  [validarJWT, check("usuario", "Debe enviar un usuario").not().isEmpty()],
  logoutPost
);

/*router.post(
  "/:usuario",
  [check("usuario", "Debe enviar un usuario").not().isEmpty()],
  logoutNoToken
);*/

module.exports = router;
