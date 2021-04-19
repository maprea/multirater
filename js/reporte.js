
$(document).ready(function() {

  // Se obtiene el hash del userid
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

  // Carga de datos
  Promise.all([
    d3.json('data-users/' + uidhash + '.json')
  ]).then( function (data) {
    let userdata = data[0];
    $('#nombre-user').html(userdata.nombre);
    // Se dibujan los contenidos
    fillSkillTable(Object.values(userdata.respuestas));
    drawRadarScores(Object.values(userdata.respuestas));
    drawConexiones(userdata.conexiones, userdata.nombre_preguntas);
    drawHighLow(Object.values(userdata.respuestas));
    drawPotentialBars(Object.values(userdata.respuestas));
  });

  // TODO: Exportar PDF
  $('#exportar-pdf').on('click', function(e) {
    e.preventDefault();
    /*
    const pdfDoc = new jsPDF();
    pdfDoc.fromHTML($('#content').html(), 15, 15);
    pdfDoc.save('reporte-evaluacion360.pdf');
    */
    window.print();
  });

  // Activa tooltips
  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  });
});




fillSkillTable = function(preguntas) {
  let tablecontent = '';
  $.map(preguntas, q => {
    tablecontent += '<tr><td><span class="badge badge-info">' + q.info.id + '</span></td>';
    tablecontent += '<td><b>' + q.info.titulo + '</b></td>';
    tablecontent += '<td>' + q.info.descripcion + '</td></tr>';
  });
  $('#tabla-skills tbody').html(tablecontent);
}


/* **************** */
/* Chart Radar Scores */
/* **************** */

drawRadarScores = function(userScores) {
  // Config del layout del polar chart
  const layout = {
    width: '800',
    height: '800',
    autosize: false,
    polar: {
      angularaxis: {
        tickfont: {
          size: 10,
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
        range: [1, 5], // rango de 1 a 5 de las habilidades
        color: 'gray',
        showline: false
      },
      bgcolor: 'rgb(245,245,245)' // color de fondo
    }
  };
  
  // Dibuja el chart con plotly
  Plotly.newPlot('radar-scores', radarChartData(userScores), layout, {displayModeBar: false, responsive: true});
}


// Datos para el chart del radar
radarChartData = function(userScores) {
  let groupMap = {
    'Puntaje máximo': 'max_score',
    'Puntaje promedio': 'avg_score',
    'Promedio Global': 'avg_global',
    'Puntaje propio': 'self_score',
    'Puntaje mínimo': 'min_score',
  };
  // Datos del chart
  return $.map(groupMap, (field_name, title) => ({
          type: 'scatterpolar',
          mode: 'lines+markers+text',
          // Se agrega el skill 1 al final, para cerrar el poligono
          r: userScores.map(s => s[field_name]).concat(userScores.map(s => s[field_name])[0]),
          // idem anterior. Agrega el label al final
          theta: userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15)).concat(userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15))[0]),
          //theta: userScores.map(s => s.info.id).concat(userScores.map(s => s.info.id)[0]),
          name: title,
          visible: true,
          opacity: 0.25,
          fill: "toself",
          line: {
            width: 2,
            dash: 'dot',
            shape: 'spline' // hace un smooth de la linea
            // color: 'red'
          },
          marker: {
            size: 8 // tamaño del punto (?)
          },
          // template html del tooltip
          hovertemplate: '<b>%{theta}</b>' + '<br>%{r:.2f}<br>'
        }));
}


/* **************** */
/* Chart Heatmap */
/* **************** */

drawConexiones = function(conexiones, currentuser) {
  // Config del layout del heatmap
  const layout = {
    width: '1000',
    height: '100%',
    autosize: true,
    //title: 'Oportunidad de conexiones',
    annotations: [],
    xaxis: {
      title: {
        text: 'Evaluad@s',
        font: { color: '#369', size: 18 },
      },
      ticks: '',
      //categoryorder: 'category ascending',
      side: 'bottom'
    },
    yaxis: {
      title: {
        text: 'Evaluador@s',
        font: { color: '#369', size: 18 },
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
      let color = '#666';
      if (currentuser == evalua || currentuser == evaluade) {
        color = '#c60'
      }
      layout.annotations.push({
        xref: 'x1',
        yref: 'y1',
        showarrow: false,
        x: chartData[0].x[j],
        y: chartData[0].y[i],
        text: Math.round(chartData[0].z[i][j] * 100) + '%',
        font: { color: color },
      });
    }
  }
  
  // Dibuja el chart con plotly
  Plotly.newPlot('oportunidad-conexiones', chartData, layout, {displayModeBar: false, responsive: true});
}

// Datos para el chart del heatmap
heatmapChartData = function(conexiones) {
  // Colorscale
  let scaleseq = d3.scaleSequential()
  .domain([0, 1])
  .interpolator(d3.interpolateBlues);   // escalas de D3: https://github.com/d3/d3-scale-chromatic
  let colscale = d3.range(0, 1.1, .1).map( x => [ x.toString(), scaleseq(1-x) ])

  // Datos del chart
  let datos = [];
  let usuaries = [];
  $.each(conexiones, function(nombre, row) {
    datos.push(Object.values(row));
    usuaries.push(nombre);
  });
  
  return [{
    x: usuaries,
    y: usuaries,
    z: datos,
    type: 'heatmap',
    //colorscale: 'Blues',
    colorscale: colscale,
  }]
}



/* **************** */
/* Charts High Low */
/* **************** */

drawHighLow = function(scores) {
  // Config del layout
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
    //barmode: 'group',
  };

  // Dibuja el chart con plotly
  Plotly.newPlot('highest-scores', chartDataHighLow(scores, true), layout, {displayModeBar: false, responsive: true});
  Plotly.newPlot('lowest-scores', chartDataHighLow(scores, false), layout, {displayModeBar: false, responsive: true});
}

// Datos para los charts de high/low scores
chartDataHighLow = function(scores, highest) {
  let ordered = scores.sort( (a,b) => d3.ascending(a.avg_score, b.avg_score) ).slice(0,5).reverse();
  let color = '#b66';
  if (highest) {
    ordered = scores.sort( (a,b) => d3.descending(a.avg_score, b.avg_score) ).slice(0,5).reverse();
    color = '#6b6';
  }
  const data = ordered.map( d => d.avg_score.toFixed(2) );
  const labels = ordered.map( d => d.info.id + '<br>' + formatTextWrap(d.info.titulo,15) );

  return [{
    type: 'bar',
    orientation: 'h',
    y: labels,
    x: data,
    text: data.map(String),
    textposition: 'auto',
    hoverinfo: 'y+x',
    //mode: 'lines+markers+text',
    marker: {
      opacity: 0.6,
      color: color,
      line: {
        color: 'rgb(8,48,107)',
        width: 1.5,
        dash: 'dot'
      }
    },
  }];
}

/* **************** */
/* Charts potenciales */
/* **************** */

drawPotentialBars = function(scores) {
  // Config del layout
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
  };

  // Dibuja el chart con plotly
  Plotly.newPlot('blindspots-bar', chartDataPotential(scores, 'blindspots'), layout, {displayModeBar: false, responsive: true});
  Plotly.newPlot('avgdistance-bar', chartDataPotential(scores, 'avgdistance'), layout, {displayModeBar: false, responsive: true});
}

// Datos para los charts de bindspot y avgdistance
chartDataPotential = function(scores, chart) {
  let ordered = scores.filter(d => (d.self_score - d.avg_score) > 0)
    .sort( (a,b) => d3.descending(a.self_score - a.avg_score, b.self_score - b.avg_score) ).slice(0,5).reverse();
  let color1 = d3.hsl("steelblue");
  let nombre = { 
    trace1:  'Autopercibido', 
    trace2: 'Promedio recibido' 
  };
  let data1 = ordered.map( d => d.self_score.toFixed(2) );
  let data2 = ordered.map( d => d.avg_score.toFixed(2) );
  if (chart == 'avgdistance') {
    ordered = scores.filter(d => (d.avg_global - d.avg_score) > 0)
      .sort( (a,b) => d3.descending(a.avg_global - a.avg_score, b.avg_global - b.avg_score) )
      .slice(0,5).reverse();
    color1 = d3.hsl("DarkCyan");
    nombre = { 
      trace1:  'Promedio recibido ', 
      trace2: 'Promedio Global', 
    };
    data1 = ordered.map( d => d.avg_score.toFixed(2) );
    data2 = ordered.map( d => d.avg_global.toFixed(2) );
  }
  let color2 = color1.copy();
  color2.h +=15;

  const traces = [ {
    data: data1,
    opacity: 0.6,
    color: color1.toString(),
    nombre: nombre.trace1,
  }, {
    data: data2,
    opacity: 0.9,
    color: color2.toString(),
    nombre: nombre.trace2,
  }];
  const labels = ordered.map( d => d.info.id + '<br>' + formatTextWrap(d.info.titulo,15) );

  return traces.map( d => ({
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



// Word wrap
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