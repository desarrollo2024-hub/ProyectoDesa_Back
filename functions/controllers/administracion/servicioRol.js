const { db } = require("../../connectors/dbconnect");
const moment = require("moment");

//Se utiliza con método get sin parametro para las consultas en general
exports.consultarRegistrosProInd = async (req, res) => {
  let { busqueda } = req.params;

  if (typeof busqueda === "undefined") {
    busqueda = "";
  }

  try {
    let rolesQuery = db.collection("rol").where("estado", "==", "A");
    const rolesSnapshot = await rolesQuery.get();
    // Convertimos los documentos de Firestore a un array de objetos
    let todosLosRoles = rolesSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // Función de búsqueda local
    function buscarRoles(roles, busqueda) {
      if (!busqueda) return roles;
      busqueda = busqueda.toUpperCase();
      return roles.filter(
        (rol) =>
          rol.data.rol.toUpperCase().includes(busqueda) ||
          (rol.data.descripcion &&
            rol.data.descripcion.toUpperCase().includes(busqueda))
      );
    }

    // Aplicamos la búsqueda local si hay un término de búsqueda
    let rolesFiltered = busqueda
      ? buscarRoles(todosLosRoles, busqueda)
      : todosLosRoles;

    let procesos = [];
    const arrayServicio = await Promise.all(
      rolesFiltered.map(async (rolDoc) => {
        const rol = rolDoc.data;
        // Obtener servicios activos para este rol
        const serviciosActivosSnapshot = await db
          .collection("servicioRol")
          .where("rol", "==", rol.rol)
          .where("estado", "==", "A")
          .get();

        const arrayActivos = await Promise.all(
          serviciosActivosSnapshot.docs.map(async (servicioRolDoc) => {
            const servicioRolData = servicioRolDoc.data();
            const servicioSnapshot = await db
              .collection("servicio")
              .where("servicio", "==", servicioRolData.servicio)
              .where("estado", "==", "A")
              .get();

            if (!servicioSnapshot.empty) {
              const servicioData = servicioSnapshot.docs[0].data();
              /*return {
                id: servicioSnapshot.docs[0].id,
                nombreIndicador: servicioData.titulo,
                value: true,
              };*/
              return {
                key: servicioSnapshot.docs[0].id,
                title: servicioData.titulo,
                description: servicioData.titulo,
              };
            }
            return null;
          })
        );
        // Filtrar servicios nulos
        const activosFiltrados = arrayActivos.filter(
          (servicio) => servicio !== null
        );

        // Obtener servicios disponibles
        const todosServiciosSnapshot = await db
          .collection("servicio")
          .where("estado", "==", "A")
          .get();

        //const serviciosActivosSet = new Set(activosFiltrados.map((s) => s.id));
        const serviciosActivosSet = new Set(activosFiltrados.map((s) => s.key));
        const disponibles = todosServiciosSnapshot.docs
          .filter((doc) => !serviciosActivosSet.has(doc.id))
          .map((doc) => ({
            /*id: doc.id,
            nombreIndicador: doc.data().titulo,*/
            key: doc.id,
            title: doc.data().titulo,
            description: doc.data().titulo,
          }));

        /*const tempObj2 = {
          id: rolDoc.id,
          nombreProceso: rol.rol + " - " + rol.descripcion,
          prefijo: rol.rol,
          activos: arrayActivos,
          disponibles,
          data: [...arrayActivos, ...disponibles],
        };*/
        const tempObj2 = {
          key: rolDoc.id,
          label: rol.rol + " - " + rol.descripcion,
          prefijo: rol.rol,
          activos: arrayActivos,
          disponibles,
          data: [...arrayActivos, ...disponibles],
        };
        procesos.push(tempObj2);
      })
    );

    procesos.sort((a, b) => a.prefijo.localeCompare(b.prefijo));

    const json = {
      procesos,
    };

    return res.status(200).json({
      codigo: 200,
      mensaje: "Consulta exitosa",
      respuesta: json,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};

//Se utiliza con método post para la creación
exports.nuevoRegistroAccordion = async (req, res) => {
  try {
    const { servicios, rol } = req.body;
    const rolSnapshot = await db.collection("rol").doc(rol).get();
    if (rolSnapshot.empty && rolSnapshot.data().estado != "A") {
      return res.status(404).json({
        codigo: 404,
        mensaje: `Rol no encontrado o activo`,
      });
    }
    const rolDoc = rolSnapshot.data();
    //const batch = db.batch();

    for (const key in servicios) {
      const servicioSnapshot = await db.collection("servicio").doc(key).get();
      if (!servicioSnapshot.empty && servicioSnapshot.data().estado == "A") {
        const servicioData = servicioSnapshot.data();
        const serviciosRolSnapshot = db
          .collection("servicioRol")
          .where("rol", "==", rolDoc.rol)
          .where("servicio", "==", servicioData.servicio)
          .where("estado", "==", "A");
        const valServicioRolSanp = await serviciosRolSnapshot.get();

        if (servicios[key] && valServicioRolSanp.empty) {
          const docRef = await db.collection("servicioRol").add({
            rol: rolDoc.rol,
            servicio: servicioData.servicio,
            estado: "A",
            fechaCreacion: moment(),
            usuarioCrea: req.usuario.usuario,
          });
        } else if (!servicios[key] && !valServicioRolSanp.empty) {
          const servicioRolMod = db
            .collection("servicioRol")
            .doc(valServicioRolSanp.docs[0].id);
          await servicioRolMod.update({
            estado: "N",
            fechaEliminacion: moment(),
            usuarioElimina: req.usuario.usuario,
          });
        }
      }
    }

    return res.status(200).json({
      codigo: 200,
      mensaje: `Relaciones realizadas con éxito`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      codigo: 500,
      mensaje: `Error: ${error}`,
    });
  }
};
