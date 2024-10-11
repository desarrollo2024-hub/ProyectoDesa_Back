const { validationResult } = require('express-validator');
const { check } = require('express-validator');


//Los middleware tiene el 3er argmento next que indica que si todo pasa al siguiente validacion
exports.validarCampos =  (req, res, next) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(400).json(errors);
    }

    next();

}
