
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
	// Modal de respuestas
	loadRespuestas(userdata.respuestas);
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
    tablecontent += '<td><span data-toggle="tooltip" data-placement="right" data-html="true" title="' + q.info.descripcion + '"><b>' + q.info.titulo + '</b> </span></td></tr>';
  });
  $('#tabla-skills tbody').html(tablecontent);
  $('[data-toggle="tooltip"]').tooltip();  
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
        range: [0, 5], // rango de 0 a 5 de las habilidades
        color: 'gray',
        showline: false
      },
      bgcolor: 'rgb(245,245,245)' // color de fondo
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
  
  // Dibuja el chart con plotly
  Plotly.newPlot('radar-scores', radarChartData(userScores), layout, {displayModeBar: false, responsive: true});
}


// Datos para el chart del radar
radarChartData = function(userScores) {
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
  // Datos del chart
  return $.map(groupMap, (title, field_name) => ({
          type: 'scatterpolar',
          mode: 'lines+markers+text',
          // Se agrega el skill 1 al final, para cerrar el poligono
          r: userScores.map(s => s[field_name]).concat(userScores.map(s => s[field_name])[0]),
          // idem anterior. Agrega el label al final
          theta: userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15)).concat(userScores.map(s => s.info.id + '<br>' + formatTextWrap(s.info.titulo, 15))[0]),
          //theta: userScores.map(s => s.info.id).concat(userScores.map(s => s.info.id)[0]),
          name: title,
          visible: true,
		  fillcolor: colorMap[field_name]['fillcolor'],
          opacity: colorMap[field_name]['opacity'],
          fill: colorMap[field_name]['fill'],
          line: {
            width: 2,
            dash: colorMap[field_name]['line'],
            shape: 'spline', // hace un smooth de la linea
          },
          marker: {
			color: colorMap[field_name]['color'],
			opacity: 1,
			size: 8, // tamaño del punto (?)
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
    width: '1200',
    height: '600',
    autosize: true,
    //title: 'Oportunidad de conexiones',
    annotations: [],
    xaxis: {
      title: {
        text: 'Evaluad@s',
        font: { color: '#0099ff', size: 18, family: "Poppins", },
      },
      ticks: '',
      //categoryorder: 'category ascending',
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
      let color = ((valor > 0.5)? '#333' : '#fff');
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
  
  // Dibuja el chart con plotly
  Plotly.newPlot('oportunidad-conexiones', chartData, layout, {displayModeBar: false, responsive: true});
}

// Datos para el chart del heatmap
heatmapChartData = function(conexiones) {
  // Colorscale
  let scaleseq = d3.scaleSequential()
  .domain([0, 1])
  .interpolator(d3.interpolate('#fff', '#00AEEF'));   // escalas de D3: https://github.com/d3/d3-scale-chromatic
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
  };

  // Dibuja el chart con plotly
  Plotly.newPlot('highest-scores', chartDataHighLow(scores, true), layout, {displayModeBar: false, responsive: true});
  Plotly.newPlot('lowest-scores', chartDataHighLow(scores, false), layout, {displayModeBar: false, responsive: true});
}

// Datos para los charts de high/low scores
chartDataHighLow = function(scores, highest) {
  let ordered = scores.sort( (a,b) => d3.ascending(a.avg_score, b.avg_score) ).slice(0,5).reverse();
  let color = '#EE3124';
  if (highest) {
    ordered = scores.sort( (a,b) => d3.descending(a.avg_score, b.avg_score) ).slice(0,5).reverse();
    color = '#A6CE39';
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

  // Dibuja el chart con plotly
  Plotly.newPlot('blindspots-bar', chartDataPotential(scores, 'blindspots'), layout, {displayModeBar: false, responsive: true});
  Plotly.newPlot('avgdistance-bar', chartDataPotential(scores, 'avgdistance'), layout, {displayModeBar: false, responsive: true});
}

// Datos para los charts de bindspot y avgdistance
chartDataPotential = function(scores, chart) {
  let ordered = scores.filter(d => (d.self_score - d.avg_score) > 0)
    .sort( (a,b) => d3.descending(a.self_score - a.avg_score, b.self_score - b.avg_score) ).slice(0,5).reverse();
  //let color1 = d3.hsl("steelblue");
  let color1 = '#666';
  let color2 = '#522E91';
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
    //color1 = d3.hsl("DarkCyan");
	color1 = '#F47920';
	color2 = '#FCAF17';
    nombre = { 
      trace1:  'Promedio Recibido ', 
      trace2: 'Promedio Global', 
    };
    data1 = ordered.map( d => d.avg_score.toFixed(2) );
    data2 = ordered.map( d => d.avg_global.toFixed(2) );
  }
  //let color2 = color1.copy();
  //color2.h +=15;

  const traces = [ {
    data: data1,
    opacity: 0.8,
    //color: color1.toString(),
	color: color1,
    nombre: nombre.trace1,
  }, {
    data: data2,
    opacity: 0.8,
    //color: color2.toString(),
	color: color2,
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



// Modal de respuestas
loadRespuestas = function (respuestas) {
	let tabla = '<table class="table table-striped"><thead><tr><th>Concepto</th><th>Respuestas</th></tr></thead><tbody>';
		$.each(respuestas, function(id, respuesta) {
			const titulo = respuesta.info.titulo;
			const selfscore = respuesta.self_score;
			const scores = respuesta.scores_realizados;
			tabla += '<tr><td>' + respuesta.info.id + ' ' + titulo + '</td><td>';
			tabla += '<span class="respuesta-self">Autopuntaje: ' + selfscore + ' </span><br>';
			$.each(scores, function(nombre, score) {
				tabla += '<span class="respuesta-nombre">' + nombre + ':</span> <span class="respuesta-score">' + score + '</span> <br> ';
			});
			tabla += '</td></tr>';
	});
	tabla += '</tbody></table>';
	$('#respuestas-realizadas .modal-body').html(tabla);
}