<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    if (ADMIN_PASSWORD_HASH && password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['admin_authenticated'] = true;
        header('Location: index.php');
        exit;
    }
    $error = 'Contraseña incorrecta.';
}

if (isset($_SESSION['admin_authenticated'])) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <title>Admin — <?= htmlspecialchars(ORG_NAME) ?></title>
  <link href="vendor/fontawesome-free/css/all.min.css" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Nunito:400,700" rel="stylesheet">
  <link href="css/sb-admin-2.css" rel="stylesheet">
  <style>
    body { background-color: #4e73df; }
    .login-card { max-width: 400px; margin: 10vh auto; }
  </style>
</head>
<body>
  <div class="container login-card">
    <div class="card shadow-lg">
      <div class="card-body p-5">
        <div class="text-center mb-4">
          <i class="fas fa-chart-line fa-3x text-primary"></i>
          <h4 class="mt-3 text-gray-800">Evaluación 360</h4>
          <p class="text-muted">Panel de administración</p>
        </div>
        <?php if ($error): ?>
          <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="post">
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" class="form-control" id="password" name="password" required autofocus>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
        </form>
      </div>
    </div>
  </div>
  <script src="vendor/jquery/jquery.min.js"></script>
  <script src="vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
