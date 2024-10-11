const moment = require("moment");
moment.locale("es");

//Formato Esperado
/*const CRUD = [
    {
      elemento: "input",
      type: "text",
      name: "rol",
      id_input: "rol",
      classNameLabel: "col-sm-3 col-form-label",
      disabled: true,
      titulo: "Rol",
      tamanio: 15,
      obligatorio: true,
      placeholder: "Ingrese nombre del Rol",
      className: "col-md-9",
      CRUD: {
        create: {
          disabled: false,
          type: "text",
        },
        read: {
          className: "col-md-12",
        },
        update: {},
      },
    },
    {
      elemento: "label",
      titulo: "¿Esta seguro que desea eliminar el rol",
      className: "col-md-12 text-center mt-1 mb-4",
      CRUD: {
        delete: {},
      },
    },
  ];*/

exports.procesaCRUD = async (CRUD) => {
  if (CRUD == "") {
    throw new Error("No hay CRUDS a formatear");
  }

  try {
    const result = {};

    CRUD.forEach((item) => {
      const { CRUD: crudActions = {} } = item;
      const newItem = { ...item };

      // Eliminar la propiedad "CRUD" del nuevo objeto
      delete newItem.CRUD;

      Object.keys(crudActions).forEach((action) => {
        if (!result[action]) {
          result[action] = [];
        }

        result[action].push({
          ...newItem,
          orden: result[action].length + 1,
          ...(crudActions[action] || {}),
        });
      });
    });

    return result;
  } catch (error) {
    return [];
  }
};

exports.formatDateDB = (
  timestamp,
  format = "YYYY-MM-DD HH:mm:ss",
  offsetHours = -6
) => {
  try {
    if (!timestamp || !timestamp.seconds) {
      return "";
    }

    const utcMoment = moment.utc(timestamp.seconds * 1000); // Convertir el timestamp a un objeto moment en UTC
    const adjustedMoment = utcMoment.add(offsetHours, "hours"); // Ajustar la hora según el offset proporcionado
    return adjustedMoment.format(format); // Formatear la fecha ajustada
  } catch (error) {
    return "Error";
  }
};
