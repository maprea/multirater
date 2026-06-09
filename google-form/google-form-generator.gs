// Google Apps Script — generates a Google Form for the 360 evaluation survey.
// Attach this script to a Google Sheet that contains the following sheets:
//   - "users": one name per row in column A (survey participants)
//   - "Preguntas": columns A=id, B=title, C=description (competency questions)
//   - "Config" (optional): column A=form title in row 1

function loadConfig(spreadsheet) {
  try {
    var row = spreadsheet.getSheetByName('Config').getDataRange().getValues()[0];
    return { formTitle: row[0] || 'Encuesta 360' };
  } catch (e) {
    return { formTitle: 'Encuesta 360' };
  }
}

function loadDataUsers(spreadsheet) {
  var rows = spreadsheet.getSheetByName('users').getDataRange().getValues();
  return rows.map(function (row) {
    return String(row[0]).trim();
  });
}

function loadDataQs(spreadsheet) {
  var rows = spreadsheet.getSheetByName('Preguntas').getDataRange().getValues();
  return rows.map(function (row) {
    return {
      id: String(row[0]).trim(),
      titulo: String(row[1]).trim(),
      descripcion: String(row[2]).trim(),
    };
  });
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Iniciar Proceso')
    .addItem('Crear nuevo Form', 'createForm')
    .addToUi();
}

function createForm() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var config = loadConfig(spreadsheet);

  var form = FormApp.create(config.formTitle);
  form.setDescription('A continuación dejamos las preguntas, categorías y definiciones presentes en la encuesta 360°. Es importante que puedas revisar con detenimiento las categorías que se evalúan y sus definiciones explícitas, esto permitirá que entre todxs tengamos un criterio homogéneo y las dudas a la hora de responder sean menores, lo que te disminuye el tiempo en la respuesta. Es el momento de levantar todas las oportunidades de mejora para que sea un instrumento realmente útil. Te agradecemos la dedicación y aportes!');

  var datausers = loadDataUsers(spreadsheet);
  var dataqs = loadDataQs(spreadsheet);

  var emailItem = form.addTextItem();
  emailItem.setTitle('Ingresá tu correo electrónico')
    .setRequired(true);

  var nameItem = form.addListItem();
  nameItem.setTitle('Tu Nombre')
    .setChoices(datausers.map(u => nameItem.createChoice(u)))
    .setRequired(true);

  dataqs.forEach(function (q) {
    datausers.sort(() => Math.random() - 0.5);

    if (Number.isInteger(Number(q['id']))) {
      form.addSectionHeaderItem().setTitle(q['titulo']);
    } else {
      var gridItem = form.addGridItem();
      gridItem.setTitle(q['id'] + ' ' + q['titulo'] + '. ' + q['descripcion'])
        .setRows(datausers)
        .setColumns(['0 (no puedo evaluar)', '1 (nunca)', '2 (muy poco)', '3 (a veces)', '4 (casi siempre)', '5 (siempre)'])
        .setRequired(true);
    }
  });

  form.addSectionHeaderItem()
    .setTitle('COMENTARIOS ADICIONALES')
    .setHelpText('Esta sección es opcional y podés utilizarla para ampliar información sobre el puntaje que hayas asignado a las personas.');
  datausers.forEach(function (u) {
    form.addParagraphTextItem().setTitle('# Comentarios adicionales [' + u + ']:');
  });
}
