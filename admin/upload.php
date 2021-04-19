<?php
$return = [];
$dest = 'data/resultados.csv';

if (isset($_POST['cargar-resultados']) && $_POST['cargar-resultados'] == 'seee' && $_FILES['uploaded-file']) {
    $fname = $_FILES['uploaded-file']['name'];
    $ftemp = $_FILES['uploaded-file']['tmp_name'];

    // Validacion de tipo
    if (strtolower(pathinfo($fname, PATHINFO_EXTENSION)) == 'csv') {
        if (move_uploaded_file($ftemp, $dest)) {
            $return["status"] = "ok";
        } else {
            $return["status"] = "error";
            $return["msg"] = "Error al subir archivo";
        }
    } else {
        $return["status"] = "error";
        $return["msg"] = "Extebsion no soportada. Debe ser CSV";
    }
}

echo json_encode($return);

?>