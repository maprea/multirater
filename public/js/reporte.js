
// Escapes a value for safe insertion into HTML
const esc = s => $('<span>').text(String(s ?? '')).html();

$(document).ready(function () {

  getParameterFromQstring = function (param) {
    let url = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (let i = 0; i < url.length; i++) {
      let urlparam = url[i].split('=');
      if (urlparam[0] == param) {
        return urlparam[1];
      }
    }
  }

  let uidhash = getParameterFromQstring('uid');

  // Validate hash format before fetching (sha256 = 64 hex chars)
  if (!uidhash || !/^[a-f0-9]{64}$/.test(uidhash)) {
    $('#nombre-user').text('Reporte no encontrado.');
    return;
  }

  Promise.all([
    d3.json('data-users/' + uidhash + '.json')
  ]).then(function (data) {
    let userdata = data[0];

    $('#nombre-user').text(userdata.nombre);
    $('#fecha').text(userdata.fecha);

    fillSkillTable(Object.values(userdata.respuestas));
    drawRadarScores(Object.values(userdata.respuestas));
    drawConexiones(userdata.conexiones, userdata.nombre_preguntas);
    drawHighLow(Object.values(userdata.respuestas));
    drawPotentialBars(Object.values(userdata.respuestas));

    loadRespuestas(userdata.respuestas, userdata.comentarios);
    loadPuntuaciones(userdata.respuestas, userdata.comentarios);

    if ('reporte_previo' in userdata) {
      $('#reporte-previo-btn').on('click', function (e) {
        window.location.href = '?uid=' + userdata.reporte_previo;
      });
      $('#reporte-previo-btn').css('display', 'inline-block');
    }
  });

  $('#exportar-pdf').on('click', function (e) {
    e.preventDefault();
    window.print();
  });

  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  });
});


fillSkillTable = function (preguntas) {
  let tablecontent = '';
  $.map(preguntas, q => {
    tablecontent += '<tr><td><span class="badge badge-info">' + esc(q.info.id) + '</span></td>';
    tablecontent += '<td><span data-toggle="tooltip" data-placement="right" data-html="true" title="' + esc(q.info.descripcion) + '"><b>' + esc(q.info.titulo) + '</b> </span></td></tr>';
  });
  $('#tabla-skills tbody').html(tablecontent);
  $('[data-toggle="tooltip"]').tooltip();
}


/* ─── Radar chart ─────────────────────────────────────────────────────────── */

drawRadarScores = function (userScores) {
  const layout = {
    width: '800',
    height: '800',
    autosize: false,
    polar: {
      angularaxis: {
        tickfont: {
          size: 14,
          family: 'Poppins',
        },
        automargin: true,
        tickangle: 0,
        linewidth: 1,
        color: 'grey',
        showline: false,
        direction: 'clockwise',
        type: 'category',
      },
      radialaxis: {
        gridcolor: 'white',
        gridwidth: 2,
        visible: true,
        range: [0, 5],
        color: 'gray',
        showline: false
      },
      bgcolor: 'rgb(245,245,245)'
    },
    legend: {
      x: 1,
      y: 1,
      font: {
        family: 'Poppins',
        size: 16,
      }
    },
  };

  Plotly.newPlot('radar-scores', radarChartData(userScores), layout, { displayModeBar: false, responsive: true });
}

radarChartData = function (userScores) {
  let colorMap = {
    'max_score': { 'color': '#00f', 'opacity': 0.5, 'fill': 'toself', 'fillcolor': '#66aaff', 'line': 'solid' },
    'avg_score': { 'color': '#7333EF', 'opacity': 1, 'fill': 'none', 'fillcolor': '#fff', 'line': 'solid' },
    'avg_global': { 'color': '#EE3124', 'opacity': 1, 'fill': 'none', 'fillcolor': '#fff', 'line': 'dot' },
    'self_score': { 'color': '#00AB4E', 'opacity': 1, 'fill': 'none', 'fillcolor': '#fff', 'line': 'solid' },
    'min_score': { 'color': '#6699ff', 'opacity': 0.7, 'fill': 'toself', 'fillcolor': '#ccc', 'line': 'solid' },
  };
  let groupMap = {
    'avg_global': 'Promedio Global',
    'self_score': 'Puntaje propio',
    'max_score': 'Puntaje máximo',
    'avg_score': 'Puntaje promedio',
    'min_score': 'Puntaje mínimo',
  };
  return $.map(groupMap, (title, field_name) => ({
    type: 'scatterpolar',
    mode: 'lines+markers+text',
    // Repeat first element to close the polygon
    r: userScores.map(s => s[field_name]).concat(userScores.map(s => s[field_name])[0]),
    theta: userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15)).concat(userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15))[0]),
    name: title,
    visible: true,
    fillcolor: colorMap[field_name]['fillcolor'],
    opacity: colorMap[field_name]['opacity'],
    fill: colorMap[field_name]['fill'],
    line: {
      width: 2,
      dash: colorMap[field_name]['line'],
      shape: 'spline',
    },
    marker: {
      color: colorMap[field_name]['color'],
      opacity: 1,
      size: 8,
    },
    hovertemplate: '<b>%{theta}</b>' + '<br>%{r:.2f}<br>'
  }));
}


/* ─── Connection heatmap ──────────────────────────────────────────────────── */

drawConexiones = function (conexiones, currentuser) {
  const layout = {
    width: '1200',
    height: '600',
    autosize: true,
    annotations: [],
    xaxis: {
      title: {
        text: 'Evaluad@s',
        font: { color: '#0099ff', size: 18, family: "Poppins", },
      },
      ticks: '',
      side: 'bottom'
    },
    yaxis: {
      title: {
        text: 'Evaluador@s',
        font: { color: '#0099ff', size: 18, family: "Poppins" },
        standoff: 25
      },
      automargin: true,
      ticks: '',
      ticksuffix: ' '
    }
  };

  let chartData = heatmapChartData(conexiones);
  for (let i = 0; i < chartData[0].y.length; i++) {
    for (let j = 0; j < chartData[0].x.length; j++) {
      let evaluade = chartData[0].x[j];
      let evalua = chartData[0].y[i];
      let valor = chartData[0].z[i][j];
      let color = ((valor > 0.5) ? '#333' : '#fff');
      if (currentuser == evalua || currentuser == evaluade) {
        color = '#FAA61A';
      }
      layout.annotations.push({
        xref: 'x1',
        yref: 'y1',
        showarrow: false,
        x: chartData[0].x[j],
        y: chartData[0].y[i],
        text: Math.round(valor * 100) + '%',
        font: {
          color: color,
          size: 12,
          family: "Poppins",
        },
      });
    }
  }

  Plotly.newPlot('oportunidad-conexiones', chartData, layout, { displayModeBar: false, responsive: true });
}

heatmapChartData = function (conexiones) {
  // Color scale: white → #00AEEF (d3-scale-chromatic)
  let scaleseq = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolate('#fff', '#00AEEF'));
  let colscale = d3.range(0, 1.1, .1).map(x => [x.toString(), scaleseq(1 - x)])

  let datos = [];
  let users = [];
  $.each(conexiones, function (nombre, row) {
    datos.push(Object.values(row));
    users.push(nombre);
  });

  return [{
    x: users,
    y: users,
    z: datos,
    type: 'heatmap',
    colorscale: colscale,
  }]
}


/* ─── High / low bar charts ───────────────────────────────────────────────── */

drawHighLow = function (scores) {
  const layout = {
    width: '100%',
    height: '100%',
    autosize: true,
    yaxis: {
      automargin: true,
      ticklen: 20,
      tickwidth: 0,
      tickcolor: '#fff',
    },
    xaxis: {
      zeroline: false,
      range: [1, 5],
    },
  };

  Plotly.newPlot('highest-scores', chartDataHighLow(scores, true), layout, { displayModeBar: false, responsive: true });
  Plotly.newPlot('lowest-scores', chartDataHighLow(scores, false), layout, { displayModeBar: false, responsive: true });
}

chartDataHighLow = function (scores, highest) {
  let ordered = scores.sort((a, b) => d3.ascending(a.avg_score, b.avg_score)).slice(0, 5).reverse();
  let color = '#EE3124';
  if (highest) {
    ordered = scores.sort((a, b) => d3.descending(a.avg_score, b.avg_score)).slice(0, 5).reverse();
    color = '#A6CE39';
  }
  const data = ordered.map(d => d.avg_score.toFixed(2));
  const labels = ordered.map(d => d.info.id + '<br>' + formatTextWrap(d.info.titulo, 15));

  return [{
    type: 'bar',
    orientation: 'h',
    y: labels,
    x: data,
    text: data.map(String),
    textposition: 'auto',
    hoverinfo: 'y+x',
    marker: {
      opacity: 0.7,
      color: color,
      line: {
        color: 'rgb(8,48,107)',
        width: 1.5,
        dash: 'dot'
      }
    },
  }];
}


/* ─── Blindspot / avg-distance bar charts ────────────────────────────────── */

drawPotentialBars = function (scores) {
  const layout = {
    width: '100%',
    height: '100%',
    autosize: true,
    yaxis: {
      automargin: true,
      ticklen: 20,
      tickwidth: 0,
      tickcolor: '#fff',
    },
    xaxis: {
      zeroline: false,
      range: [1, 5],
    },
    barmode: 'group',
    legend: {
      x: 1,
      y: 1,
      font: {
        family: 'Poppins',
        size: 16,
      },
      traceorder: 'reversed',
    },
  };

  Plotly.newPlot('blindspots-bar', chartDataPotential(scores, 'blindspots'), layout, { displayModeBar: false, responsive: true });
  Plotly.newPlot('avgdistance-bar', chartDataPotential(scores, 'avgdistance'), layout, { displayModeBar: false, responsive: true });
}

chartDataPotential = function (scores, chart) {
  let ordered = scores.filter(d => (d.self_score - d.avg_score) > 0)
    .sort((a, b) => d3.descending(a.self_score - a.avg_score, b.self_score - b.avg_score)).slice(0, 5).reverse();
  let color1 = '#666';
  let color2 = '#522E91';
  let nombre = {
    trace1: 'Autopercibido',
    trace2: 'Promedio recibido'
  };
  let data1 = ordered.map(d => d.self_score.toFixed(2));
  let data2 = ordered.map(d => d.avg_score.toFixed(2));
  if (chart == 'avgdistance') {
    ordered = scores.filter(d => (d.avg_global - d.avg_score) > 0)
      .sort((a, b) => d3.descending(a.avg_global - a.avg_score, b.avg_global - b.avg_score))
      .slice(0, 5).reverse();
    color1 = '#F47920';
    color2 = '#FCAF17';
    nombre = {
      trace1: 'Promedio Recibido ',
      trace2: 'Promedio Global',
    };
    data1 = ordered.map(d => d.avg_score.toFixed(2));
    data2 = ordered.map(d => d.avg_global.toFixed(2));
  }

  const traces = [{
    data: data1,
    opacity: 0.8,
    color: color1,
    nombre: nombre.trace1,
  }, {
    data: data2,
    opacity: 0.8,
    color: color2,
    nombre: nombre.trace2,
  }];
  const labels = ordered.map(d => d.info.id + '<br>' + formatTextWrap(d.info.titulo, 15));

  return traces.map(d => ({
    type: 'bar',
    orientation: 'h',
    y: labels,
    x: d.data,
    text: d.data.map(String),
    textposition: 'auto',
    name: d.nombre,
    hoverinfo: 'name+x',
    marker: {
      opacity: d.opacity,
      color: d.color,
      line: {
        color: 'rgb(8,48,107)',
        width: 1.5,
        dash: 'dot'
      }
    },
  }));
}


const formatTextWrap = (text, maxLineLength) => {
  const words = text.replace(/[\r\n]+/g, ' ').split(' ');
  let lineLength = 0;

  return words.reduce((result, word) => {
    if (lineLength + word.length >= maxLineLength) {
      lineLength = word.length;
      return result + `<br>${word}`;
    } else {
      lineLength += word.length + (result ? 1 : 0);
      return result ? result + ` ${word}` : `${word}`;
    }
  }, '');
}


/* ─── Modals ──────────────────────────────────────────────────────────────── */

loadRespuestas = function (respuestas, comentarios) {
  let tabla = '<table class="table table-striped"><thead><tr><th>Concepto</th><th>Respuestas</th></tr></thead><tbody>';
  $.each(respuestas, function (id, respuesta) {
    const titulo = respuesta.info.titulo;
    const selfscore = respuesta.self_score;
    const scores = respuesta.scores_realizados;
    tabla += '<tr><td>' + esc(respuesta.info.id) + ' ' + esc(titulo) + '</td><td>';
    tabla += '<span class="respuesta-self">Autopuntaje: ' + esc(selfscore) + ' </span><br>';
    $.each(scores, function (nombre, score) {
      tabla += '<span class="respuesta-nombre">' + esc(nombre) + ':</span> <span class="respuesta-score">' + esc(score) + '</span> <br> ';
    });
    tabla += '</td></tr>';
  });
  tabla += '</tbody></table>';
  if (comentarios?.realizados) {
    let tablaComentarios = '<table class="table table-striped"><thead><tr><th>Comentario adicional para...</th><th>Comentario realizado</th></tr></thead><tbody>';
    $.each(comentarios.realizados, function (nombre, comentario) {
      tablaComentarios += '<tr><td>' + esc(nombre) + '</td><td>' + esc(comentario) + '</td></tr>';
    });
    tablaComentarios += '</tbody></table>';
    $('#respuestas-realizadas .modal-body').html('<div>' + tabla + '<hr>' + tablaComentarios + '</div>');
  } else {
    $('#respuestas-realizadas .modal-body').html(tabla);
  }
}


loadPuntuaciones = function (respuestas, comentarios) {
  if (!Object.values(respuestas)[0].scores_recibidos_nombres) {
    $("#puntaje-recibido-btn").attr("style", "display: none !important");
    return;
  }
  let tabla = '<table class="table table-striped"><thead><tr><th>Concepto</th><th>Puntuaciones recibidas</th></tr></thead><tbody>';
  $.each(respuestas, function (id, respuesta) {
    const titulo = respuesta.info.titulo;
    const selfscore = respuesta.self_score;
    const scores = respuesta.scores_recibidos;
    const nombres = respuesta.scores_recibidos_nombres;
    tabla += '<tr><td>' + esc(respuesta.info.id) + ' ' + esc(titulo) + '</td><td>';
    tabla += '<span class="respuesta-self">Autopuntaje: ' + esc(selfscore) + ' </span><br>';
    $.each(scores, function (index, score) {
      const nombre = nombres[index];
      tabla += '<span class="respuesta-nombre">' + esc(nombre) + ':</span> <span class="respuesta-score">' + esc(score) + '</span> <br> ';
    });
    tabla += '</td></tr>';
  });
  tabla += '</tbody></table>';
  if (comentarios?.recibidos) {
    let tablaComentarios = '<table class="table table-striped"><thead><tr><th>Comentario adicional de...</th><th>Comentario recibido</th></tr></thead><tbody>';
    $.each(comentarios.recibidos, function (nombre, comentario) {
      tablaComentarios += '<tr><td>' + esc(nombre) + '</td><td>' + esc(comentario) + '</td></tr>';
    });
    tablaComentarios += '</tbody></table>';
    $('#puntajes-recibidos .modal-body').html('<div>' + tabla + '<hr>' + tablaComentarios + '</div>');
  } else {
    $('#puntajes-recibidos .modal-body').html(tabla);
  }
}
