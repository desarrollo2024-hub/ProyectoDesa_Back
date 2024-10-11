const { db } = require("../connectors/dbconnect");

exports.obtenerRutasPorRol = async (rol) => {
  if (rol == "") {
    throw new Error(
      "El usuario no tiene rol configurado. contacte al administrador"
    );
  }
  try {
    // Obtener los servicios asociados al rol
    const serviciosSnapshot = await db
      .collection("servicio")
      .where("estado", "==", "A")
      .get();

    const servicioRolSnapshot = await db
      .collection("servicioRol")
      .where("estado", "==", "A")
      .where("rol", "==", rol)
      .get();

    const serviciosPermitidos = new Set();
    servicioRolSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data && data.servicio) {
        serviciosPermitidos.add(data.servicio);
      }
    });

    const dbServicios = [];
    serviciosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data && serviciosPermitidos.has(data.servicio)) {
        dbServicios.push({
          id: doc.id,
          modulo: data.modulo || "",
          iconoModulo: data.iconoModulo || "",
          servicio: data.servicio || "",
          titulo: data.titulo || "",
          ruta: data.ruta || "",
          icono: data.icono || "",
          orden: data.orden || "[]",
        });
      }
    });

    // Paso 1: Ordenar los servicios según el campo "orden"
    const sortedServicios = dbServicios.sort((a, b) => {
      const ordenA = JSON.parse(a.orden);
      const ordenB = JSON.parse(b.orden);
      for (let i = 0; i < Math.min(ordenA.length, ordenB.length); i++) {
        if (ordenA[i] !== ordenB[i]) {
          return ordenA[i] - ordenB[i];
        }
      }
      return ordenA.length - ordenB.length;
    });

    // Paso 2: Crear la estructura deseada
    const result = [];
    for (const servicio of sortedServicios) {
      const orden = JSON.parse(servicio.orden);
      let currentLevel = result;
      if (orden.length > 1) {
        for (let i = 0; i < orden.length; i++) {
          const modulo = servicio.modulo.slice(1, -1).split(",")[i];
          const iconoModulo = servicio.iconoModulo.slice(1, -1).split(",")[i];
          let existingElement = currentLevel.find(
            (el) => el.element === modulo
          );
          if (!existingElement) {
            existingElement = {
              element: modulo,
              icono: iconoModulo,
              orden: orden[i],
              subMenu: [],
            };
            if (modulo) {
              currentLevel.push(existingElement);
            }
          }
          if (modulo) {
            currentLevel = existingElement.subMenu;
          }
        }
      }
      currentLevel.push({
        path: servicio.ruta,
        componente: servicio.servicio,
        texto: servicio.titulo,
        icono: servicio.icono,
        orden: orden[orden.length - 1],
      });
    }

    return result;
  } catch (error) {
    console.log(error);
    return 0;
  }
};

exports.passTemp = async (length = 15) => {
  const caracteresPermitidos =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&/_()=?¿';
  const resultado = Array.from({ length }, () =>
    caracteresPermitidos.charAt(
      Math.floor(Math.random() * caracteresPermitidos.length)
    )
  ).join("");
  console.log("CONTRASEÑA TEMPORAL", resultado);
  return resultado;
};
