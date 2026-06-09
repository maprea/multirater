<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['admin_authenticated'])) {
    header('Location: login.php');
    exit;
}

$_SESSION['csrf_token'] = $_SESSION['csrf_token'] ?? bin2hex(random_bytes(32));
?>
<!DOCTYPE html>
<html lang="es">

<head>

  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="description" content="">
  <meta name="author" content="">
  <meta name="csrf-token" content="<?= $_SESSION['csrf_token'] ?>">

  <title>Reporte Evaluación 360</title>

  <link href="vendor/fontawesome-free/css/all.min.css" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i" rel="stylesheet">
  <link href="css/sb-admin-2.css" rel="stylesheet">

  <script>
    const APP_CONFIG = { orgName: "<?= htmlspecialchars(ORG_NAME, ENT_QUOTES) ?>" };
  </script>

</head>

<body id="page-top">

  <div id="wrapper">

    <ul class="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion" id="accordionSidebar">

      <a class="sidebar-brand d-flex align-items-center justify-content-center" href="index.php">
        <div class="sidebar-brand-icon rotate-n-15">
          <i class="fas fas fa-chart-line"></i>
        </div>
        <div class="sidebar-brand-text mx-3">Reporte Evaluación 360</div>
      </a>

      <hr class="sidebar-divider my-0">

      <li class="nav-item active">
        <a class="nav-link" href="index.php">
          <i class="fas fa-fw fa-tachometer-alt"></i>
          <span>Validar resultados</span></a>
      </li>

      <li class="nav-item active">
        <a class="nav-link" href="#" id="generar-reportes-link">
          <i class="fas fa-fw fa-users"></i>
          <span>Generar reportes</span></a>
      </li>

      <hr class="sidebar-divider">

      <div class="text-center d-none d-md-inline">
        <button class="rounded-circle border-0" id="sidebarToggle"></button>
      </div>

    </ul>

    <div id="content-wrapper" class="d-flex flex-column">

      <div id="content">

        <nav class="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
          <button id="sidebarToggleTop" class="btn btn-link d-md-none rounded-circle mr-3">
            <i class="fa fa-bars"></i>
          </button>
        </nav>

        <div class="container-fluid">

          <div class="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0 text-gray-800">Generación y validación de reportes de Evaluación 360</h1>

            <div class="col-auto mr-3">
              <button data-toggle="modal" data-target="#upload-modal" type="button" class="btn btn-info"><i class="fas fa-upload fa-sm text-white-50"></i> Cargar Resultados</button>
            </div>
          </div>

          <div class="row">

            <div class="col mb-4">

              <div class="card shadow mb-4">
                <div class="card-header py-3">
                  <h6 class="m-0 font-weight-bold text-primary">Validación de resultados</h6>
                </div>
                <div class="card-body" id="validation-area">
                  <div id='validation-msg'></div>

                  <div class="col-xs-12 mb-4">
                    <div class="card border-left-warning shadow h-100 py-2">
                      <div class="card-body">
                        <div class="row no-gutters align-items-center">
                          <div class="col mr-2">
                            <div class="text-sm font-weight-bold text-warning text-uppercase mb-1">
                              <i class="fas fa-users fa-2x text-gray-300 mr-3"></i>Asignación de personas evaluadas a nombres en preguntas
                            </div>
                            <form id="actualizar-asignaciones-form">
                              <table class="table table-striped text-sm" id="tabla-users">
                                <thead>
                                  <tr>
                                    <th>Nombre registrado</th>
                                    <th>Mail</th>
                                    <th>Nombre en preguntas</th>
                                  </tr>
                                </thead>
                                <tbody></tbody>
                              </table>
                            </form>
                          </div>
                        </div>
                        <div class="row mr-3">
                          <div class="col-12 text-right">
                            <span id="actualizar-asignaciones-msg"></span>
                            <button type="button" class="btn btn-info" id="actualizar-asignaciones-btn"><i class="fas fa-users fa-sm text-white-50"></i> Actualizar Asignaciones</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="col-xs-12 mb-4">
                    <div class="card border-left-warning shadow h-100 py-2">
                      <div class="card-body">
                        <div class="row no-gutters align-items-center">
                          <div class="col mr-2">
                            <div class="text-sm font-weight-bold text-warning text-uppercase mb-1">
                              <i class="fas fa-question fa-2x text-gray-300 mr-3"></i>Preguntas de la evaluación
                            </div>
                            <table class="table table-striped text-sm" id="tabla-preguntas">
                              <thead>
                                <tr>
                                  <th>Id</th>
                                  <th>Título</th>
                                  <th>Descripción</th>
                                  <th># Opciones</th>
                                </tr>
                              </thead>
                              <tbody></tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

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

  <!-- Modal Instrucciones -->
  <div class="modal fade" id="instructions-modal" tabindex="-1" role="dialog" aria-labelledby="instructions-modal" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Instrucciones</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-primary">
            <b>Formato del formulario: </b> Campos Mail y Nombre (en ese orden) obligatorios.
          </p>
          <p><img class="img-fluid" src="images/eval-formfields.png"></p>
          <p class="text-primary">
            <b>Formato de preguntas: </b> ID TITULO. DESCRIPCION
          </p>
          <p><img class="img-fluid" src="images/eval-formatopregs.png"></p>
          <p class="pl-5 text-muted">
            <b>ID: </b>X.Y (donde X e Y representan números y se separan con un punto '.')
          </p>
          <p class="pl-5 text-muted">
            <b>TITULO: </b>El título de la pregunta (no debe contener puntos '.' porque el separador de la descripción es ese símbolo). El título siempre finaliza con punto '.'
          </p>
          <p class="pl-5 text-muted">
            <b>DESCRIPCION: </b>Detalle de la pregunta (no debe contener corchetes '[' o ']')
          </p>
          <p class="pl-5 text-info">
            <b>Scores: </b> 0: No aplica, luego utilizar del 1 al 5.
          </p>
          <hr>
          <p class="pt-2 text-primary">
            <b>Instrucciones de carga de resultados: </b></p>
          <p class="pl-5">
            <ul>
              <li class="p-2">1) Cargar el csv obtenido de Google Forms con el botón superior derecho
                <button disabled type="button" class="btn btn-info"><i class="fas fa-upload fa-sm text-white-50"></i> Cargar Resultados</button>
              </li>
              <li class="p-2">2) Asociar los nombres de las preguntas y participantes y generar asignaciones con el botón
                <button disabled type="button" class="btn btn-info"><i class="fas fa-users fa-sm text-white-50"></i> Actualizar Asignaciones</button>
              </li>
              <li class="p-2">3) Verificar errores en la validación del formulario (inspección visual).</li>
              <li class="p-2">4) Generar reportes y enviarlos con la opción del menú izquierdo
                <a class="nav-link" disabled>
                  <i class="fas fa-fw fa-users"></i>
                  <span>Generar reportes</span></a>
              </li>
            </ul>
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Upload -->
  <div class="modal fade" id="upload-modal" tabindex="-1" role="dialog" aria-labelledby="upload-modal" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Cargar resultados del formulario</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="upload-form">
        <div class="modal-body">
          <div class="custom-file">
            <input type="file" class="custom-file-input" name="uploaded-file" id="upload-filename">
            <label class="custom-file-label" for="upload-filename">Seleccionar archivo</label>
            <div style="display: none;" id="upload-results">
              <span></span>
            </div>
          </div>
          <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
          <button type="submit" class="btn btn-primary" id="upload-submit">Subir archivo</button>
        </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal Generar Reportes -->
  <div class="modal fade" id="reports-modal" tabindex="-1" role="dialog" aria-labelledby="reports-modal" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Generación y envío de reportes</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="reports-form">
        <div class="modal-body">
          <div id="reports-user-content">
            <table class="table table-striped text-sm" id="tabla-reportes">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Mail</th>
                  <th>Nombre asignado en preguntas</th>
                  <th>Enviar</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <div style="display: none;" id="reports-results"><span></span></div>
          <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
          <button type="submit" class="btn btn-primary" id="reports-submit">Generar y enviar reportes</button>
        </div>
        </form>
      </div>
    </div>
  </div>

  <script src="vendor/jquery/jquery.min.js"></script>
  <script src="vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
  <script src="vendor/jquery-easing/jquery.easing.min.js"></script>
  <script src="js/sb-admin-2.min.js"></script>
  <script src="js/multirater.js"></script>

</body>

</html>
