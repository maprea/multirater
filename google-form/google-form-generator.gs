// Generador del Google Form para completar la encuesta (se lanza desde una Spreadsheet linkeada)

function loadDataUsers(spreadsheet) {
  var rows = spreadsheet.getSheetByName('Usuaries').getDataRange().getValues();
  //var headers = rows.shift();
  return rows.map(function (row) {
    return String(row[0]).trim();
  });
}

function loadDataQs(spreadsheet) {
  var rows = spreadsheet.getSheetByName('Preguntas').getDataRange().getValues();
  //var headers = rows.shift();
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

  var form = FormApp.create('Encuesta 360 - ISF')
  
  form.setDescription('A continuación dejamos las preguntas, categorías y definiciones presentes en la encuesta 360°. Es importante que puedas revisar con detenimiento las categorías que se evalúan y sus definiciones explícitas, esto permitirá que entre todxs tengamos un criterio homogéneo y las dudas a la hora de responder sean menores, lo que te disminuye el tiempo en la respuesta. Es el momento de levantar todas las oportunidades de mejora para que sea un instrumento realmente útil. Te agradecemos la dedicación y aportes!');
  
  datausers = loadDataUsers(spreadsheet);
  dataqs = loadDataQs(spreadsheet);
  // Logger.log(datausers);
  // Logger.log(dataqs);

  var item = form.addTextItem();
  item.setTitle('Ingresá tu correo electrónico')
    .setRequired(true);

  var item = form.addListItem();
  item.setTitle('Tu Nombre')
    .setChoices(datausers.map(u => item.createChoice(u)))
    .setRequired(true);
  

  dataqs.forEach(function (q) {
    datausers.sort(() => Math.random() - 0.5);

    if (Number.isInteger(Number(q['id']))) {
      form.addSectionHeaderItem().setTitle(q['titulo']);
    } else {
      
      var item = form.addGridItem();
      item.setTitle(q['id'] + ' ' + q['titulo'] + '. ' + q['descripcion'])
        .setRows(datausers)
        //.setColumns([0, 1, 2, 3, 4, 5])
        // Version con labels
        .setColumns(['0 (no puedo evaluar)', '1 (nunca)', '2 (muy poco)', '3 (a veces)', '4 (casi siempre)', '5 (siempre)'])
        .setRequired(true);
    }
  });

  // Comentarios texto libre
  form.addSectionHeaderItem()
    .setTitle('COMENTARIOS ADICIONALES')
    .setHelpText('Esta sección es opcional y podés utilizarla para ampliar información sobre el puntaje que hayas asignado a las personas.');
  datausers.forEach(function (u) {
    form.addParagraphTextItem().setTitle('# Comentarios adicionales [' + u + ']:')
  });
}