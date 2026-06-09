<?php

require_once 'auth.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$return = [];
$dest   = __DIR__ . '/data/resultados.csv';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode($return);
    exit;
}

// CSRF validation
$token = $_POST['csrf_token'] ?? '';
if (!$token || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'msg' => 'Token de sesión inválido. Recargá la página e intentá de nuevo.']);
    exit;
}

if (!isset($_FILES['uploaded-file']) || $_FILES['uploaded-file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'msg' => 'No se recibió ningún archivo.']);
    exit;
}

$fname = $_FILES['uploaded-file']['name'];
$ftemp = $_FILES['uploaded-file']['tmp_name'];
$fsize = $_FILES['uploaded-file']['size'];

if ($fsize > 5 * 1024 * 1024) {
    echo json_encode(['status' => 'error', 'msg' => 'El archivo supera el límite de 5 MB.']);
    exit;
}

if (strtolower(pathinfo($fname, PATHINFO_EXTENSION)) !== 'csv') {
    echo json_encode(['status' => 'error', 'msg' => 'Extensión no soportada. Debe ser CSV.']);
    exit;
}

$mime = mime_content_type($ftemp);
if (!in_array($mime, ['text/plain', 'text/csv', 'application/csv', 'application/octet-stream'], true)) {
    echo json_encode(['status' => 'error', 'msg' => 'Tipo de archivo no válido.']);
    exit;
}

if (move_uploaded_file($ftemp, $dest)) {
    $return['status'] = 'ok';
} else {
    $return['status'] = 'error';
    $return['msg']    = 'Error al subir archivo.';
}

echo json_encode($return);
