const nodemailer = require("nodemailer");
const config = require("../config");

const enviarCorreo = (email, asunto, html) => {
  console.log("Inicio de rutina de envío de correos");
  const transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: true,
    auth: {
      user: config.EMAIL_CORREO,
      pass: config.EMAIL_CONTRASENA,
    },
  });

  const mailOptions = {
    from: config.EMAIL_CORREO,
    to: email,
    subject: asunto,
    html: html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(`Error al enviar el correo a ${email}:`, error);
    } else {
      console.log(`Correo enviado a ${email}:`, info.response);
    }
  });
};

module.exports = {
  enviarCorreo,
};
