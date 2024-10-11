const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const config = require("../config"); //Se requiere el archivo de configuracion

class Server {
  constructor() {
    this.app = express();
    this.port = config.PORT || 8080;
    this.routesPath = path.resolve(__dirname, "../routes"); //Se obtiene el directorio donde se encuentran los archivos
    this.middlewares(); //Middlewares Se ejecuta siempre al levantar server
    this.routes(); //Rutas de aplicacion
  }

  middlewares() {
    this.app.use(cors({ origin: config.URL_AUTORIZADAS }));
    this.app.use(express.json()); //Parseo y lectura de body, Recibir json
  }

  routes() {
    const packageJson = require("../package.json");
    const version = packageJson.version;

    this.app.get("/", (req, res) => {
      res.json({ version: version }); // Cambiamos a res.json ya que res.render puede no estar disponible
    });

    const getRoutePath = (filePath) => {
      const pathParts = filePath
        .replace(this.routesPath, "")
        .split(path.sep)
        .slice(1);
      const routePath = `/${pathParts.join("/")}`;
      return routePath;
    };

    const registerRoutes = (dirPath) => {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          registerRoutes(filePath);
        } else if (path.extname(filePath) === ".js") {
          const routePath = getRoutePath(filePath).split(".")[0];
          const routeModule = require(filePath);
          this.app.use(routePath, routeModule);
        }
      }
    };

    registerRoutes(this.routesPath);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }
}

module.exports = Server;
