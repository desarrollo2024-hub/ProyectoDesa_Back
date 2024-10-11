// firestoreSeeder.js
const { db } = require("../connectors/dbconnect");
const moment = require("moment");
const collection = "rol";

const registrosAInsertar = [
  {
    rol: "ROL0",
    descripcion: "ROL ADMINISTRADOR",
    fechaCreacion: moment(),
    usuarioCrea: "ADMIN",
    estado: "A",
  },
];

async function seedRegistro() {
  const batch = db.batch();
  const documentoRef = db.collection(collection);

  for (const dato of registrosAInsertar) {
    // Generar un nuevo documento con ID automático
    const nuevoDoc = documentoRef.doc();
    batch.set(nuevoDoc, dato);
  }

  try {
    await batch.commit();
    console.log(`${registrosAInsertar.length} datos insertados correctamente`);
  } catch (error) {
    console.error("Error al insertar dato:", error);
  }
}

seedRegistro();
