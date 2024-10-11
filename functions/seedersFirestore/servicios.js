// firestoreDynamicSeeder.js
const { db } = require("../connectors/dbconnect");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

async function seedFirestore() {
  try {
    // Obtener todos los archivos en la carpeta routes
    const routeDir = path.join(__dirname, "..", "routes");

    function buscarArchivos(dir, ext) {
      let archivos = [];
      const contenidos = fs.readdirSync(dir);
      for (let i = 0; i < contenidos.length; i++) {
        const ruta = path.join(dir, contenidos[i]);
        if (fs.statSync(ruta).isDirectory()) {
          archivos = archivos.concat(buscarArchivos(ruta, ext));
        } else if (path.extname(ruta) === ext) {
          if (
            !["login.js", "upDownloadExcel.js"].includes(path.basename(ruta))
          ) {
            archivos.push(ruta);
          }
        }
      }
      return archivos;
    }

    const routeFiles = await buscarArchivos(routeDir, ".js");

    const batch = db.batch();
    let servicioCounter = 0;

    for (const file of routeFiles) {
      const relativePath = path.relative(routeDir, file);
      const routePath = `/${relativePath
        .split(".")
        .slice(0, -1)
        .join("/")
        .replace(/\\/g, "/")}`;
      const routeModule = require(file);
      const servicio = path.basename(file, ".js");

      const servicioData = {
        modulo: routeModule.meta.Modulo,
        iconoModulo: routeModule.meta.IconoModulo,
        servicio: servicio.charAt(0).toUpperCase() + servicio.slice(1),
        titulo: routeModule.meta.Titulo,
        descripcion: routeModule.meta.Descripcion,
        ruta: routeModule.meta.Ruta,
        icono: routeModule.meta.Icono,
        orden: routeModule.meta.Orden,
        fechaCreacion: moment(),
        estado: "A",
      };

      // Crear documento en la colección 'servicios'
      const servicioRef = db.collection("servicio").doc();
      batch.set(servicioRef, servicioData);

      // Crear documento en la colección 'serviciosRol'
      const servicioRolData = {
        rol: "ROL0",
        servicio: servicio.charAt(0).toUpperCase() + servicio.slice(1),
        usuarioCrea: "ADMIN",
        fechaCreacion: moment(),
        estado: "A",
      };
      const servicioRolRef = db.collection("servicioRol").doc();
      batch.set(servicioRolRef, servicioRolData);

      servicioCounter++;

      // Firestore tiene un límite de 500 operaciones por lote
      if (servicioCounter % 400 === 0) {
        await batch.commit();
        batch = db.batch(); // Crear un nuevo lote
      }
    }

    // Commit final para cualquier operación restante
    if (servicioCounter % 400 !== 0) {
      await batch.commit();
    }

    console.log(
      `Se han insertado ${servicioCounter} servicios y sus roles correspondientes.`
    );
  } catch (error) {
    console.error("Error al sembrar datos en Firestore:", error);
    throw error;
  }
}

// Ejecutar el seeder
seedFirestore()
  .then(() => {
    console.log("Seeding completado con éxito.");
  })
  .catch((error) => {
    console.error("Error durante el seeding:", error);
  });
