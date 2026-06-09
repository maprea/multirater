<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['admin_authenticated'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'msg' => 'No autorizado']);
    exit;
}
