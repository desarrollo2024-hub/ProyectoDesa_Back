const Server = require("./connectors/server"); //Se requiere las configuraciones

const server = new Server();

//server.listen();
// Exportamos la instancia de express en lugar de llamar a listen()
// Para desarrollo local
if (process.env.NODE_ENV === "development") {
  server.listen();
}

module.exports = server.app;
