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
  
  form.setDescription('Las siguientes preguntas conforman la encuesta de evaluación 360 para analizar el rendimiento dentro de la organización. Por favor, contestar todas las preguntas completando para cada persona (cada fila dentro de las respuestas) la valoración que consideres. En caso de no haber tenido suficiente relación con esa persona para evaluarla en cierto aspecto, responder con una valuación de 0. No olvides también evaluarte a vos mism@!');
  
  datausers = loadDataUsers(spreadsheet);
  dataqs = loadDataQs(spreadsheet);
  Logger.log(datausers);
  Logger.log(dataqs);

  var item = form.addTextItem();
  item.setTitle('Ingresá tu correo electrónico')
    .setRequired(true);

  var item = form.addListItem();
  item.setTitle('Tu Nombre')
    .setChoices(datausers.map(u => item.createChoice(u)))
    .setRequired(true);
  

  dataqs.forEach(function (q) {
    datausers.sort(() => Math.random() - 0.5);

    //form.addSectionHeaderItem()
    //  .setTitle(q);
    
    var item = form.addGridItem();
    item.setTitle(q['id'] + ' ' + q['titulo'] + '. ' + q['descripcion'])
      .setRows(datausers)
      //.setColumns([0, 1, 2, 3, 4, 5])
      // Version con labels
      .setColumns(['0 (no puedo evaluar)', '1 (nunca)', '2 (muy poco)', '3 (a veces)', '4 (casi siempre)', '5 (siempre)'])
      .setRequired(true);
  });
}