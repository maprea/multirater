<?php require_once __DIR__ . '/config.php'; ?>
<!DOCTYPE html>
<html lang="es">

<head>

  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="description" content="">
  <meta name="author" content="">

  <title><?= htmlspecialchars(ORG_NAME) ?> - Reporte de Evaluación 360</title>

  <link href="css/fontawesome-free.all.min.css" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i" rel="stylesheet">
  <link href="css/sb-admin-2.css" rel="stylesheet">
  <link href="css/reporte.css" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Poppins">

  <script>
    const APP_CONFIG = { orgName: "<?= htmlspecialchars(ORG_NAME, ENT_QUOTES) ?>" };
  </script>

</head>

<body id="page-top">

  <div id="wrapper">

    <div id="content-wrapper" class="d-flex flex-column">

      <div id="content">

        <nav class="navbar navbar-expand navbar-light bg-gradient-secondary topbar mb-4 static-top shadow">
          <ul class="navbar-nav ml-auto">
            <div class="sidebar-brand-icon rotate-n-15">
              <i class="fas fas fa-chart-line"></i>
            </div>
            <div class="sidebar-brand-text mx-3">Reporte de Evaluación <span id="fecha"></span></div>
          </ul>
        </nav>

        <div class="container-fluid">

          <div class="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0 text-gray-800">Reporte de evaluación 360 de <span id="nombre-user"></span></h1>
            <button data-toggle="modal" data-target="#respuestas-realizadas" type="button"
              class="d-sm-inline-block btn btn-sm btn-info"><i class="fas fa-address-card fa-sm text-white-50"></i> Ver Respuestas</button>
            <button id="puntaje-recibido-btn" data-toggle="modal" data-target="#puntajes-recibidos" type="button"
              class="d-sm-inline-block btn btn-sm btn-info"><i class="fas fa-address-card fa-sm text-white-50"></i> Ver Puntuaciones Recibidas</button>
            <button id="reporte-previo-btn" type="button" class="btn btn-sm btn-secondary"><i
                class="fas fa-archive fa-sm text-white-50"></i> Ver Reporte Anterior</button>
            <button id="exportar-pdf" class="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm"><i
                class="fas fa-download fa-sm text-white-50"></i> Exportar Reporte</button>
          </div>

          <div class="row">
            <div class="col-md-12 mb-4">
              <div class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                  <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                      <div class="text-sm font-weight-bold text-warning text-uppercase mb-2">¿Cómo leer este reporte?</div>
                    </div>
                    <div class="col-auto text-sm">
                      <p>Este reporte se ha generado a partir de las respuestas recibidas tanto de tu parte como de tus compañeros y compañeras del equipo.</p>
                      <ul>
                        <li>Te recomendamos comenzar por el gráfico de puntuaciones donde se resumen todas las métricas calculadas. Allí podrás sacar algunas conclusiones. A continuación podés ver la tabla donde se presentan las oportunidades de conexión para fortalecer los vínculos del equipo.</li>
                        <li>Finalmente se muestran gráficos específicos donde podrás hacer foco para analizar algunos aspectos de la evaluación.</li>
                        <li>Las puntuaciones recibidas en cada área se resumen a través de los parámetros estadísticos de mínima, máxima y media (promedio), excluyendo la valoración autopercibida.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-lg-8">
              <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 class="m-0 font-weight-bold text-primary">Puntuaciones recibidas y autopercibidas</h6>
                </div>
                <div class="card-body">
                  <div class="mt-2">
                    <table class="table text-sm">
                      <tr>
                        <td class="text-muted">Aquí encontrarás el puntaje máximo, mínimo y promedio recibido en cada área, junto con el promedio global y el puntaje autopercibido.</td>
                        <td width="70%"><span class="titulo-tips">Tips para interpretar el gráfico:</span>
                          <ul>
                            <li>Podés ver todas las categorías a la vez o filtrar para ver una sola, o comparar dos categorías de manera mas sencilla.</li>
                            <li>Si no recordás qué significa cada categoría apoya el mouse sobre la categoría en el lateral y te aparecerá la definición.</li>
                            <li>Te recomendamos prestar atención a las categorías en las que obtuviste el promedio más bajo y más alto de respuesta.</li>
                            <li>Podés cotejar la diferencia entre el auto puntaje y los promedios o ver el gráfico de Potenciales puntos ciegos.</li>
                            <li>No dejes de prestar atención a respuestas en la que el puntaje mínimo baja abruptamente. Cuando sucede eso y el promedio es alto, es posible que se trate de la impresión de una sola persona y allí tengas una oportunidad para conversar.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div class="chart-area" id="radar-scores"></div>
                </div>
              </div>
            </div>

            <div class="col-lg-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 class="m-0 font-weight-bold text-primary">Conceptos evaluados</h6>
                </div>
                <div class="card-body">
                  <table class="table table-striped text-sm" id="tabla-skills">
                    <tbody></tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col mb-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Oportunidad de conexión</h6>
                </div>
                <div class="card-body">
                  <div class="mt-2">
                    <table class="table text-sm">
                      <tr>
                        <td class="text-primary" width="10%">Tabla de oportunidades</td>
                        <td class="text-muted">Este gráfico presenta a cada miembro del equipo. En cada fila encontrarás a las personas que evaluaron, y en cada columna a las personas que fueron evaluadas. La tabla permite visualizar el porcentaje de respuestas que se pudieron evaluar. Un valor de 100% indica que quien evalúa ha podido puntuar en todas las áreas a la persona evaluada, un porcentaje del 0% indica que no pudo evaluar en nada a esa persona y por lo tanto existe una oportunidad de conexión.</td>
                        <td width="50%"><span class="titulo-tips">Tips para interpretar el gráfico:</span>
                          <ul>
                            <li>Te sugerimos ubicarte como persona que evalúa en la fila correspondiente y analizar las celdas más oscuras, de este modo podrás identificar a quienes conocés más y por lo tanto si existe una oportunidad de conexión.</li>
                            <li>Repetir el mismo proceso pero seleccionando la columna propia para identificar a las personas que al evaluar no no hayan podido puntuarte en todas las áreas. Es otro modo de encontrar oportunidades de conexión.</li>
                            <li>A nivel global, es posible determinar aquellas personas que tienen poca interacción con otras (atendiendo a las columnas muy oscuras). Esta información permite trabajar en una mayor integración dentro del equipo.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div class="chart-area" id="oportunidad-conexiones"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-lg-6 mb-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Áreas más fuertes</h6>
                </div>
                <div class="card-body">
                  <div class="chart-area" id="highest-scores"></div>
                </div>
              </div>
            </div>

            <div class="col-lg-6 mb-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Áreas a desarrollar</h6>
                </div>
                <div class="card-body">
                  <div class="chart-area" id="lowest-scores"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-lg-6 mb-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Potenciales puntos ciegos</h6>
                </div>
                <div class="card-body">
                  <div class="mt-2 pb-4">
                    <table class="table text-sm">
                      <tr>
                        <td class="text-muted">Aquí encontrarás aquellas áreas donde existe mayor diferencia entre el promedio recibido y tu autopercepción.</td>
                        <td width="70%"><span class="titulo-tips">Tips para interpretar el gráfico:</span>
                          <ul>
                            <li>Si observás áreas con mucha diferencia entre promedio recibido y el puntaje autopercibido), sería bueno que puedas charlarlo con el equipo para intentar reducir la brecha.</li>
                            <li>Las áreas están ordenadas por diferencia de puntuación, así que siempre conviene analizar primero las de arriba.</li>
                            <li>Sólo se presentan las diferencias donde el puntaje autopercibido es mayor al recibido, por lo cual es posible que no figure área a revisar.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div class="chart-area" id="blindspots-bar"></div>
                </div>
              </div>
            </div>

            <div class="col-lg-6 mb-4">
              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Potenciales áreas a mejorar</h6>
                </div>
                <div class="card-body">
                  <div class="mt-2">
                    <table class="table text-sm">
                      <tr>
                        <td class="text-muted">Este es un gráfico similar al diagrama de áreas a desarrollar, pero aquí se ordena de acuerdo a la distancia entre tu puntuación recibida respecto al promedio global.</td>
                        <td width="70%"><span class="titulo-tips">Tips para interpretar el gráfico:</span>
                          <ul>
                            <li>Las áreas que aparecen arriba serán aquellas con mayor distancia de tu puntuación respecto al promedio, por lo cual indica que estás más alejado de la media del equipo.</li>
                            <li>Una distancia corta no indica que no haya nada por mejorar, quizá el promedio del área es de por sí bajo.</li>
                            <li>Sólo se presentan las diferencias donde el puntaje recibido es menor al promedio global del área, por lo cual es posible que no figure área a revisar.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div class="chart-area" id="avgdistance-bar"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <footer class="sticky-footer bg-white">
        <div class="container my-auto">
          <div class="copyright text-center my-auto">
            <span>Copyright &copy; <?= htmlspecialchars(ORG_NAME) ?> <script>document.write(new Date().getFullYear())</script></span>
          </div>
        </div>
      </footer>

    </div>

  </div>

  <a class="scroll-to-top rounded" href="#page-top">
    <i class="fas fa-angle-up"></i>
  </a>

  <!-- Modal Respuestas -->
  <div class="modal fade" id="respuestas-realizadas" tabindex="-1" role="dialog" aria-labelledby="respuestas-realizadas" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Respuestas de la evaluación</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Puntuaciones Recibidas -->
  <div class="modal fade" id="puntajes-recibidos" tabindex="-1" role="dialog" aria-labelledby="puntajes-recibidos" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Puntuaciones recibidas de la evaluación</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>

  <script src="js/jquery.min.js"></script>
  <script src="js/bootstrap.bundle.min.js"></script>
  <script src="js/jquery.easing.min.js"></script>
  <script src="js/sb-admin-2.min.js"></script>
  <script src="https://d3js.org/d3.v5.min.js"></script>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <script src="js/reporte.js"></script>

</body>

</html>
