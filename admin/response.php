<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\OAuth;
use League\OAuth2\Client\Provider\Google;

require_once __DIR__ . '/vendor/PHPMailer/src/Exception.php';
require_once __DIR__ . '/vendor/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/PHPMailer/src/SMTP.php';
require_once  __DIR__ . '/vendor/PHPMailer/vendor/autoload.php';


$return = [];

// Validacion de resultados
if (isset($_POST['accion']) && $_POST['accion'] == 'validar') {
    $resultados = parseResultados();
    $return['status'] = $resultados['status'] ? 'ok' : 'error';
    $return['msg'] = $resultados['msg'];
    $return['preguntas'] = $resultados['preguntas_sin_user'];
    $return['users'] = $resultados['users'];
    $return['users_en_preguntas'] = $resultados['users_en_preguntas'];
}

// Asignar nombres
if (isset($_POST['accion']) && $_POST['accion'] == 'asignar-nombres') {
    unset($_POST['accion']);
    
    $resultados = parseResultados();
    $users_maps = [];
    foreach( $_POST as $id => $value ) {
        $resultados['users'][$id]["nombre_preguntas"] = $value;
    }
          
    // Se guardan mapeos
    if (saveUsersFiles($resultados['users'])) {
        $return['status'] = 'ok';
    } else {
        $return['msg'] = 'No fue posible actualizar las asignaciones de nombres.';
        $return['status'] = 'error';
    }
}

// Generar Reportes
if (isset($_POST['accion']) && $_POST['accion'] == 'generar-reportes') {
    $resultados = parseResultados(true);
    // Se guardan calculos de puntuaciones (datos completos para reporte)
    if (saveUsersFiles($resultados['users'])) {
        $return['status'] = 'ok';
    } else {
        $return['msg'] = 'No fue posible guardar la generacion de resultados parcial.';
        $return['status'] = 'error';
    }
    $return['status'] = $resultados['status'] ? 'ok' : 'error';
    $return['msg'] = $resultados['msg'];
    $return['users'] = $resultados['users'];
}

// Enviar Reportes
if (isset($_POST['accion']) && $_POST['accion'] == 'enviar-reportes') {
	$count = 0;
    foreach($_POST["userid"] as $uid) {
        $userjson = loadUserFile($uid);
        // Envio de mails
        if (!enviarMailReporte($userjson)) {
            $return['status'] = 'error';
            $return['msg'] = 'Al menos un email no pudo ser enviado. Revisar los logs.';
            break;
        }
		$count++;
    }
    $return['status'] = 'ok';
    $return['msg'] = $count . ' reportes enviados';
}


function parseResultados($calcular_scores = false) {
    $datos = [];
    $resultados = 'data/resultados.csv';

    if (($h = fopen($resultados, "r")) !== FALSE) {
        while (($data = fgetcsv($h)) !== FALSE) {
            $datos[] = $data;
        }
        fclose($h);

        // Preguntas (columnas que empiezan con X.X)
        $salida['preguntas'] = preg_grep("/^(\d+)?\.\d+/", $datos[0]);
        $preguntas_sin_user = [];
        $users_en_preguntas = [];
        // Los usuarios se agregan entre corchetes al final [user] (generado por gforms)
        foreach ($salida['preguntas'] as $q) {
            $parsed = parseUserDePregunta($q);
            $preguntas_sin_user[] = $parsed["pregunta"];
            $users_en_preguntas[] = $parsed["user"];
        }
        $preguntas_opciones = array_count_values($preguntas_sin_user);
        $preguntas_sin_user = array_values(array_unique($preguntas_sin_user));
        
        $ids_preguntas = [];
        foreach($preguntas_sin_user as $q) {
            $pregunta = parsePregunta($q);
            $ids_preguntas[] = $pregunta["id"];
            $pregunta["cant_opciones"] = $preguntas_opciones[$q];
            $salida['preguntas_sin_user'][] = $pregunta;
        }
        sort($salida['preguntas_sin_user']);

        // Usuaries (3 columna del csv) 
        foreach (array_slice($datos,1) as $rowid => $row) {
            $user["nombre"] = trim($row[2]);    // <- EDITAR ACA SI EL CAMPO DEL USUARIE ES OTRO EN EL FORM DE GOOGLE
            $user["mail"] = trim($row[1]);      // <- EDITAR ACA SI EL CAMPO DEL MAIL ES OTRO EN EL FORM DE GOOGLE
            $user["rowid"] = $rowid;
            $usersaved = loadUserFile($rowid);
            $user["nombre_preguntas"] = "";
            $user["nombre_preguntas"] = $usersaved->{"nombre_preguntas"};
            if (isset($usersaved->{"nombre_preguntas"}) && $calcular_scores) {
                // Si ya esta mapeado user a nombre de respuesta, se computan respuestas de cada user
                $user["respuestas"] = obtenerPuntuaciones($salida['preguntas'], $row, $user["nombre_preguntas"]);
                $user["conexiones"] = calcularConexiones($user);
            }
            $salida['users'][$user["rowid"]] = $user;
        }
        $salida['users_en_preguntas'] = array_values(array_unique($users_en_preguntas));
        sort($salida['users_en_preguntas']);
        sort($salida['users']);

        // Calculo de puntuaciones recibidas del resto
        if ($calcular_scores) {
            foreach($salida["users"] as $rowid => $user) {
                if (isset($user["respuestas"])) {
                    $salida["users"][$rowid]["respuestas"] = calcularScoreRecibido($salida["users"], $rowid, $user["nombre_preguntas"]);
                }
            }
            // Calculo de avg global
            $scores_globales = calcularAvgGlobal($salida["users"]);
            foreach($salida["users"] as $rowid => $user) {
                foreach($user["respuestas"] as $qid => $r) {
                    $salida["users"][$rowid]["respuestas"][$qid]["avg_global"] = $scores_globales[$qid];
                }
            }
            // Recopilacion de todas las conexiones
            $conexiones = [];
            foreach($salida["users"] as $rowid => $user) {
                ksort($user["conexiones"]);
                $conexiones[$user["nombre_preguntas"]] = $user["conexiones"];
            }
            ksort($conexiones);
            foreach($salida["users"] as $rowid => $user) {
                $salida["users"][$rowid]["conexiones"] = $conexiones;
            }
        }

        
        // Validaciones
        $salida['status'] = true;
        $salida['msg'] = "<b>Validación de resultados incorrecta</b>";
		
        // Cantidad de personas evaluadas vs respuestas enviadas
        if (count($salida['users']) != count($salida['users_en_preguntas'])) {
            $salida['status'] = false;
            $salida['msg'] .= "<br>La cantidad de personas evaluadas (" . count($salida['users']) . ") no coincide con la de las preguntas (" . count($salida['users_en_preguntas']) . ").";
        }
        // IDs duplicados de preguntas
        if (count($ids_preguntas) != count(array_unique($ids_preguntas))) {
            $salida['status'] = false;
            $salida['msg'] .= "<br>Existen IDs de preguntas duplicados.";
        }
        // Cantidad de opciones (users) x pregunta
        if (count(array_unique($preguntas_opciones)) != 1) {
            $salida['status'] = false;
            $salida['msg'] .= "<br>La cantidad de opciones en alguna de las preguntas no coincide en todas las preguntas.";
        }
        if (empty($preguntas_opciones) || reset($preguntas_opciones) != (count($salida['users'])) ) {
            $salida['status'] = false;
            $salida['msg'] .= "<br>La cantidad de opciones en alguna de las preguntas no coincide con la cantidad de respuestas registradas.";
        }
		
        if ($salida['status']) {
            $salida['msg'] = "La validación es correcta, pero verifique que no existan nombres inconsistentes entre las personas.";
        }
    } else {
        $salida['status'] = 'error';
        $salida['msg'] = 'No existe archivo de resultados cargado para validar.';
    }


    return $salida;
}


echo json_encode($return);





// Files de usuaries

function saveUsersFiles($users) {
    $data_users_dir = '../data-users/';
    foreach($users as $user) {
        $userfile = getUserHash($user["rowid"]) . ".json";
        if (($h = fopen($data_users_dir . $userfile, "w")) !== FALSE) {
            fwrite($h, json_encode($user));
            fclose($h);
        } else {
            return false;
        }
    }
    return true;
}

function loadUserFile($rowid) {
    $data_users_dir = '../data-users/';
    $str = file_get_contents($data_users_dir . getUserHash($rowid) . ".json");
    if ($str !== FALSE) {
        return json_decode($str);
    } else {
        return '';
    }
}

function getUserHash($rowid) {
	// Genera un hash unico para cada mes-año
    return md5($rowid . date("Ym"));
}



// Helpers para preguntas
function parsePregunta($q) {
    $finId = strpos($q, " ");
    $inicioDesc = strpos($q, ".", $finId);
    $pregunta["id"] = trim(substr($q, 0, $finId));
    $pregunta["titulo"] = trim(substr($q, $finId, $inicioDesc - $finId));
    $pregunta["descripcion"] = trim(substr($q, $inicioDesc + 1));
    return $pregunta;
}

function parseUserDePregunta($q) {
    // Google Forms agrega al final de la pregunta: [user]
    $ret["pregunta"] = trim(explode("[", $q)[0]);
    $ret["user"] = explode("]", explode("[", $q)[1])[0];
    return $ret;
}


// Computo de puntuaciones y conexiones

function obtenerPuntuaciones($headers, $valores, $uname) {
    // Modificar si se reciben sólo números enteros (ahora toma sólo primer dígito)
    $preguntas = [];
    foreach($headers as $colid => $q) {
        $pregunta = parsePregunta(parseUserDePregunta($q)["pregunta"]);
        $currentuser = parseUserDePregunta($q)["user"];
        if ($currentuser == $uname) {
            // puntuacion propia
            $preguntas[$pregunta["id"]]["self_score"] = intval($valores[$colid][0]);    // <- Modificar si se usan solo nros de score
        } else {
            $preguntas[$pregunta["id"]]["scores_realizados"][$currentuser] = intval($valores[$colid][0]);     // <- Modificar si se usan solo nros de score
        }
        $preguntas[$pregunta["id"]]["info"] = $pregunta;
    }
    return $preguntas;
}

function calcularConexiones($userdata) {
    // Calcula las conexiones del usuarie
    $respuestas = $userdata["respuestas"];
    $conexiones = [];
    $cant_preguntas = count($respuestas);
    foreach($respuestas as $q) {
        foreach($q["scores_realizados"] as $user => $score) {
            if (isset($conexiones[$user])) {
                $conexiones[$user] += ($score > 0) ? 1 / $cant_preguntas : 0;
            } else {
                $conexiones[$user] = ($score > 0) ? 1 / $cant_preguntas : 0;
            }
        }
    }
    $conexiones[$userdata["nombre_preguntas"]] = 1;
    return $conexiones;
}

function calcularScoreRecibido($users, $userid, $uname) {
    // Calcula el score recibido, computando min, max y avg.
    $respuestas = $users[$userid]["respuestas"];
    foreach($users as $rowid => $user) {
        if ($rowid != $userid) {
            foreach($user["respuestas"] as $qid => $r) {
                $respuestas[$qid]["scores_recibidos"][] = $r["scores_realizados"][$uname];
            }
        }
    }
    // Descriptivas para cada pregunta
    foreach($respuestas as $qid => $q) {
        $scores = array_filter($q["scores_recibidos"]);
        if (count($scores) == 0) {
            $respuestas[$qid]["max_score"] = 0;
            $respuestas[$qid]["min_score"] = 0;
            $respuestas[$qid]["avg_score"] = 0;
        } else {
            $respuestas[$qid]["max_score"] = max($scores);
            $respuestas[$qid]["min_score"] = min($scores);
            $respuestas[$qid]["avg_score"] = array_sum($scores) / count($scores);
        }
    }
    return $respuestas;
}

function calcularAvgGlobal($users) {
    // Calcula las puntuaciones promedio de cada pregunta
    $preguntas = [];
    foreach($users as $user) {
        foreach($user["respuestas"] as $qid => $r) {
            $preguntas[$qid]["scores"][] = $r["avg_score"];
        }
    }
    foreach($preguntas as $qid => $q) {
        $scores = array_filter($q["scores"]);
        $preguntas[$qid] = (count($scores) == 0) ? 0 : array_sum($scores) / count($scores);
    }
    return $preguntas;
}


// Envio de reportes por mail
function enviarMailReporte($userdata) {
    error_log("Enviando reporte de " . $userdata->{"nombre"} . " a " . $userdata->{"mail"} . " (" . getUserHash($userdata->{"rowid"}) . ").");
    $linkreporte = 'https://staff.isf-argentina.org/evaluacion-360/?uid=' . getUserHash($userdata->{"rowid"});
    $mail = new PHPMailer(true);

    try {
        //Server settings
        //$mail->SMTPDebug = SMTP::DEBUG_SERVER;                      //Enable verbose debug output
        $mail->isSMTP();                                            //Send using SMTP
        $mail->Host       = 'smtp.gmail.com';                     //Set the SMTP server to send through
        $mail->SMTPAuth   = true;                                   //Enable SMTP authentication
        $mail->AuthType = 'XOAUTH2';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;         //Enable TLS encryption; `PHPMailer::ENCRYPTION_SMTPS` encouraged
        $mail->Port       = 587;                                    //TCP port to connect to, use 465 for `PHPMailer::ENCRYPTION_SMTPS` above

        // Auth
        $email = 'automatizaciones@isf-argentina.org';
        $clientId = '656035065931-6mu44gm50uc17q34edsfgcdn5p68tjnj.apps.googleusercontent.com';
        $clientSecret = '5TtaHb1zfSNlU2EAn7bZDv06';
        // Obtained by configuring and running get_oauth_token.php
        // after setting up an app in Google Developer Console.
        $refreshToken = '1//0hxjgr-WBLVy_CgYIARAAGBESNwF-L9IrVwXZFnUOn49uzUNyjTv0i5xSH7fVPgYarxCq7pbu5ETIWn9PikfZaYUJIkwwCHVwans';
        //Create a new OAuth2 provider instance
        $provider = new Google(
            [
                'clientId' => $clientId,
                'clientSecret' => $clientSecret,
            ]
        );

        //Pass the OAuth provider instance to PHPMailer
        $mail->setOAuth(
            new OAuth(
                [
                    'provider' => $provider,
                    'clientId' => $clientId,
                    'clientSecret' => $clientSecret,
                    'refreshToken' => $refreshToken,
                    'userName' => $email,
                ]
            )
        );

        //Recipients
        $mail->setFrom($email, 'ISF Argentina');
        $mail->addAddress($userdata->{"mail"});     //Add a recipient
        //$mail->addReplyTo('info@example.com', 'Information');
        //$mail->addCC('cc@example.com');
        //$mail->addBCC('bcc@example.com');

        //Content
        $mail->isHTML(true);                                  //Set email format to HTML
        $mail->Subject = 'Reporte de Evaluacion 360';
        $mail->Body    = '<html><body><p style="color: #369">Hola '.$userdata->{"nombre"}.', el reporte de la evaluaci&oacute;n 360 ya se ha generado.</p>';
        $mail->Body   .= '<p>Puedes acceder al informe a trav&eacute;s del siguiente link: ';
        $mail->Body   .= '<a href=' . $linkreporte . '>' . $linkreporte . '</a>';

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("El mail no pudo enviarse. Error: {$mail->ErrorInfo}");
        return false;
    }
}

?>