const nuevoUsuario = (nombre = "", usuario = "", contrasena = "") => {
  return `
    <div style="text-align: center; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);" >
        <table class="form-control" style="width: 100%; margin: 0 auto; padding-left: 10px; padding-right: 10px;" border="0" cellpadding="0" cellspacing="0" >
            <tr>  
                <td style=" text-align: center; ">
                    <img src="https://i.postimg.cc/tJFvP1zv/lotus-flores-y-nombre.png" alt="GRUPO"  style="width:20%; height:auto;">
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:center">
                    <h1 style="color: #000">Bienvenido</h1>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <label style="color: #000">¡Hola <b>${nombre}</b>!</label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Nos complace informarte que tu cuenta ha sido creada exitosamente. 
                    <br/>
                    A continuación, encontrarás los detalles de tu nueva cuenta: </label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify;" >
                    <br/>
                    <label style="color: #000">Usuario: <strong style="color: #0D6EFD">${usuario.toUpperCase()}</strong>
                    <br/>Contraseña: <strong style="color: #0D6EFD"> ${contrasena}</strong></label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Te recomendamos cambiar tu contraseña después de tu primer inicio de sesión para mantener la seguridad de tu cuenta.</label>              
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a tu jefe inmediato.<br/>
                    O  comunicarte al correo: soporte@grupolotus.com.gt</label>              
                </td>
        </table>
    </div>
    `;
};

const reseteoClave = (nombre = "", contrasena = "") => {
  return `
      <div style="text-align: center; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);" >
        <table class="form-control" style="width: 100%; margin: 0 auto; padding-left: 10px; padding-right: 10px;" border="0" cellpadding="0" cellspacing="0" >
            <tr>  
                <td style=" text-align: center; ">
                    <img src="https://i.postimg.cc/tJFvP1zv/lotus-flores-y-nombre.png" alt="GRUPO"  style="width:20%; height:auto;">
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:center">
                    <h1 style="color: #000">Recuperación de Contraseña</h1>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <label style="color: #000">Estimado usuario, <b>${nombre}</b></label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Se ha solicitado reiniciar tu contraseña. 
                    <br/>
                    Adjunto encontraras una contraseña nueva, generada </label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify;" >
                    <br/>
                    <label style="color: #000">Nueva contraseña: <strong style="color: #0D6EFD">${contrasena}</strong>
                    </label>
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Te recomendamos cambiar tu contraseña después de tu inicio de sesión para mantener la seguridad de tu cuenta.</label>              
                </td>
            </tr>
            <tr bgcolor="#fff">
                <td style="text-align:justify">
                    <br/>
                    <label style="color: #000">Si no fuiste tu quien solicito un cambio de contraseña, porfavor contacta a tu jefe inmediato.<br/>
                    Cualquier duda o comentario comunicarte al correo: soporte@grupolotus.com.gt</label>              
                </td>
        </table>
    </div>
      `;
};

module.exports = { nuevoUsuario, reseteoClave };
