// firestoreSeeder.js
const { db } = require("../connectors/dbconnect");
const moment = require("moment");
const collection = "puerto";

const registrosAInsertar = [
  {
    nombre: "QUETZAL",
    descripcion: "Puerto Quetzal Guatemala",
    fechaCreacion: moment(),
    usuarioCrea: "ADMIN",
    estado: "A",
  },
  {
    nombre: "SAN JOSE",
    descripcion: "Puerto san Jose Guatemala",
    fechaCreacion: moment(),
    usuarioCrea: "ADMIN",
    estado: "A",
  },
  {
    nombre: "SHEKOU",
    descripcion: "Shekou Shenzhen China",
    fechaCreacion: moment(),
    usuarioCrea: "ADMIN",
    estado: "A",
  },
  {
    nombre: "IZTAPA",
    descripcion: "Puerto Iztapa Guatemala",
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
