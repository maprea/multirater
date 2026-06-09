<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\OAuth;
use League\OAuth2\Client\Provider\Google;

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/vendor/PHPMailer/src/Exception.php';
require_once __DIR__ . '/vendor/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/vendor/PHPMailer/vendor/autoload.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('date.timezone', 'America/Buenos_Aires');

// Google Forms CSV column positions (0-indexed)
// Column 0: timestamp, 1: email, 2: name — adjust if your form adds fields before these
const CSV_COL_EMAIL = 1;
const CSV_COL_NAME  = 2;

$return = [];

try {

    if (isset($_POST['accion']) && $_POST['accion'] == 'validar') {
        $resultados = parseResultados();
        $return['status'] = $resultados['status'] ? 'ok' : 'error';
        $return['msg'] = $resultados['msg'];
        $return['preguntas'] = $resultados['preguntas_sin_user'];
        $return['users'] = $resultados['users'];
        $return['users_en_preguntas'] = $resultados['users_en_preguntas'];
    }

    if (isset($_POST['accion']) && $_POST['accion'] == 'asignar-nombres') {
        unset($_POST['accion']);

        $resultados = parseResultados();
        foreach ($_POST as $id => $value) {
            $resultados['users'][$id]['nombre_preguntas'] = $value;
        }

        if (saveUsersFiles($resultados['users'])) {
            $return['status'] = 'ok';
        } else {
            $return['msg'] = 'No fue posible actualizar las asignaciones de nombres.';
            $return['status'] = 'error';
        }
    }

    if (isset($_POST['accion']) && $_POST['accion'] == 'generar-reportes') {
        $resultados = parseResultados(true);
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

    if (isset($_POST['accion']) && $_POST['accion'] == 'enviar-reportes') {
        $count = 0;
        foreach ($_POST['userid'] as $uid) {
            $userjson = loadUserFile($uid);
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

    echo json_encode($return);

} catch (Exception $e) {
    error_log($e->getMessage());
    error_log($e->getTraceAsString());
    error_log(print_r($return, true));
}

function parseResultados($calcular_scores = false) {
    $datos = [];
    $resultados = 'data/resultados.csv';

    if (($h = fopen($resultados, 'r')) !== false) {
        while (($data = fgetcsv($h)) !== false) {
            $datos[] = $data;
        }
        fclose($h);

        // Column headers starting with '#' are free-text comment fields
        $headers_comentarios = preg_grep('/^# /', $datos[0]);
        // Column headers matching X.Y format are scored competency questions
        $salida['preguntas'] = preg_grep('/^(\d+)?\.\d+/', $datos[0]);
        $preguntas_sin_user = [];
        $users_en_preguntas = [];
        // Google Forms appends the evaluatee's name in brackets: "1.1 Título. Descripción [Nombre]"
        foreach ($salida['preguntas'] as $q) {
            $parsed = parseUserDePregunta($q);
            $preguntas_sin_user[] = $parsed['pregunta'];
            $users_en_preguntas[] = $parsed['user'];
        }
        $preguntas_opciones = array_count_values($preguntas_sin_user);
        $preguntas_sin_user = array_values(array_unique($preguntas_sin_user));

        $ids_preguntas = [];
        foreach ($preguntas_sin_user as $q) {
            $pregunta = parsePregunta($q);
            $ids_preguntas[] = $pregunta['id'];
            $pregunta['cant_opciones'] = $preguntas_opciones[$q];
            $salida['preguntas_sin_user'][] = $pregunta;
        }
        sort($salida['preguntas_sin_user']);

        foreach (array_slice($datos, 1) as $rowid => $row) {
            $user['nombre'] = trim($row[CSV_COL_NAME]);
            $user['mail']   = trim($row[CSV_COL_EMAIL]);
            $user['rowid']  = $rowid;
            $user['fecha']  = date('m/Y');
            $usersaved = loadUserFile($rowid);
            $user['nombre_preguntas'] = '';
            $user['nombre_preguntas'] = $usersaved->nombre_preguntas ?? '';
            $user['respuestas']  = [];
            $user['comentarios'] = [];
            $user['conexiones']  = [];
            if (!empty($user['nombre_preguntas']) && $calcular_scores) {
                $user['respuestas']  = obtenerPuntuaciones($salida['preguntas'], $row, $user['nombre_preguntas']);
                $user['comentarios'] = obtenerComentarios($headers_comentarios, $row, $user['nombre_preguntas']);
                $user['conexiones']  = calcularConexiones($user);
            }
            $salida['users'][$user['rowid']] = $user;
        }
        $salida['users_en_preguntas'] = array_values(array_unique($users_en_preguntas));
        sort($salida['users_en_preguntas']);
        sort($salida['users']);

        if ($calcular_scores) {
            foreach ($salida['users'] as $rowid => $user) {
                if (isset($user['respuestas'])) {
                    $salida['users'][$rowid]['respuestas'] = calcularScoreRecibido($salida['users'], $rowid, $user['nombre_preguntas']);
                }
            }
            $scores_globales = calcularAvgGlobal($salida['users']);
            foreach ($salida['users'] as $rowid => $user) {
                foreach ($user['respuestas'] as $qid => $r) {
                    $salida['users'][$rowid]['respuestas'][$qid]['avg_global'] = $scores_globales[$qid];
                }
            }
            $conexiones = [];
            foreach ($salida['users'] as $rowid => $user) {
                ksort($user['conexiones']);
                $conexiones[$user['nombre_preguntas']] = $user['conexiones'];
            }
            ksort($conexiones);
            foreach ($salida['users'] as $rowid => $user) {
                $salida['users'][$rowid]['conexiones'] = $conexiones;
            }
            foreach ($salida['users'] as $rowid => $user) {
                $salida['users'][$rowid]['comentarios']['recibidos'] = comentariosRecibidos($salida['users'], $rowid, $user['nombre_preguntas']);
            }
        }

        $salida['status'] = true;
        $salida['msg'] = '<b>Validación de resultados incorrecta</b>';

        if (count($salida['users']) != count($salida['users_en_preguntas'])) {
            $salida['status'] = false;
            $salida['msg'] .= '<br>La cantidad de personas evaluadas (' . count($salida['users']) . ') no coincide con la de las preguntas (' . count($salida['users_en_preguntas']) . ').';
        }
        if (count($ids_preguntas) != count(array_unique($ids_preguntas))) {
            $salida['status'] = false;
            $salida['msg'] .= '<br>Existen IDs de preguntas duplicados.';
        }
        if (count(array_unique($preguntas_opciones)) != 1) {
            $salida['status'] = false;
            $salida['msg'] .= '<br>La cantidad de opciones en alguna de las preguntas no coincide en todas las preguntas.';
        }
        if (empty($preguntas_opciones) || reset($preguntas_opciones) != count($salida['users'])) {
            $salida['status'] = false;
            $salida['msg'] .= '<br>La cantidad de opciones en alguna de las preguntas no coincide con la cantidad de respuestas registradas.';
        }

        if ($salida['status']) {
            $salida['msg'] = 'La validación es correcta, pero verifique que no existan nombres inconsistentes entre las personas.';
        }
    } else {
        $salida['status'] = 'error';
        $salida['msg'] = 'No existe archivo de resultados cargado para validar.';
    }

    return $salida;
}


function saveUsersFiles($users) {
    $data_users_dir = '../data-users/';
    foreach ($users as $user) {
        $userfile = getUserHash($user['rowid']) . '.json';
        if (($h = fopen($data_users_dir . $userfile, 'w')) !== false) {
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
    $str = file_get_contents($data_users_dir . getUserHash($rowid) . '.json');
    return ($str !== false) ? json_decode($str) : '';
}

function getUserHash($rowid) {
    return hash('sha256', $rowid . date('Ym') . APP_HASH_SALT);
}


function parsePregunta($q) {
    $finId = strpos($q, ' ');
    $inicioDesc = strpos($q, '.', $finId);
    $pregunta['id']          = trim(substr($q, 0, $finId));
    $pregunta['titulo']      = trim(substr($q, $finId, $inicioDesc - $finId));
    $pregunta['descripcion'] = trim(substr($q, $inicioDesc + 1));
    return $pregunta;
}

function parseUserDePregunta($q) {
    // Google Forms appends the evaluatee name as [Nombre] at the end of each question title
    $ret['pregunta'] = trim(explode('[', $q)[0]);
    $ret['user']     = explode(']', explode('[', $q)[1])[0];
    return $ret;
}


function obtenerPuntuaciones($headers, $valores, $uname) {
    // Scores are stored as "N (label)" — intval() extracts the leading digit
    $preguntas = [];
    foreach ($headers as $colid => $q) {
        $pregunta    = parsePregunta(parseUserDePregunta($q)['pregunta']);
        $currentuser = parseUserDePregunta($q)['user'];
        if ($currentuser == $uname) {
            $preguntas[$pregunta['id']]['self_score'] = intval($valores[$colid][0]);
        } else {
            $preguntas[$pregunta['id']]['scores_realizados'][$currentuser] = intval($valores[$colid][0]);
        }
        $preguntas[$pregunta['id']]['info'] = $pregunta;
    }
    return $preguntas;
}

function obtenerComentarios($headers, $valores, $uname) {
    $comentarios = [];
    foreach ($headers as $colid => $label) {
        $destinatario = parseUserDePregunta($label)['user'];
        if ($destinatario != $uname) {
            $comentarios['realizados'][$destinatario] = $valores[$colid];
        }
    }
    $comentarios['recibidos'] = [];
    return $comentarios;
}

function calcularConexiones($userdata) {
    $respuestas = $userdata['respuestas'];
    $conexiones = [];
    $cant_preguntas = count($respuestas);
    foreach ($respuestas as $q) {
        foreach ($q['scores_realizados'] as $user => $score) {
            if (isset($conexiones[$user])) {
                $conexiones[$user] += ($score > 0) ? 1 / $cant_preguntas : 0;
            } else {
                $conexiones[$user] = ($score > 0) ? 1 / $cant_preguntas : 0;
            }
        }
    }
    $conexiones[$userdata['nombre_preguntas']] = 1;
    return $conexiones;
}

function comentariosRecibidos($users, $userid, $uname) {
    $comentarios_recibidos = $users[$userid]['comentarios']['recibidos'];
    foreach ($users as $rowid => $user) {
        if ($rowid != $userid) {
            $comentarios_recibidos[$user['nombre_preguntas']] = $user['comentarios']['realizados'][$uname];
        }
    }
    return $comentarios_recibidos;
}

function calcularScoreRecibido($users, $userid, $uname) {
    $respuestas = $users[$userid]['respuestas'];
    foreach ($users as $rowid => $user) {
        if ($rowid != $userid) {
            foreach ($user['respuestas'] as $qid => $r) {
                $respuestas[$qid]['scores_recibidos'][]        = $r['scores_realizados'][$uname];
                $respuestas[$qid]['scores_recibidos_nombres'][] = $user['nombre_preguntas'];
            }
        }
    }
    foreach ($respuestas as $qid => $q) {
        $scores = array_filter($q['scores_recibidos']);
        if (count($scores) == 0) {
            $respuestas[$qid]['max_score'] = 0;
            $respuestas[$qid]['min_score'] = 0;
            $respuestas[$qid]['avg_score'] = 0;
        } else {
            $respuestas[$qid]['max_score'] = max($scores);
            $respuestas[$qid]['min_score'] = min($scores);
            $respuestas[$qid]['avg_score'] = array_sum($scores) / count($scores);
        }
    }
    return $respuestas;
}

function calcularAvgGlobal($users) {
    $preguntas = [];
    foreach ($users as $user) {
        foreach ($user['respuestas'] as $qid => $r) {
            $preguntas[$qid]['scores'][] = $r['avg_score'];
        }
    }
    foreach ($preguntas as $qid => $q) {
        $scores = array_filter($q['scores']);
        $preguntas[$qid] = (count($scores) == 0) ? 0 : array_sum($scores) / count($scores);
    }
    return $preguntas;
}


function enviarMailReporte($userdata) {
    error_log('Enviando reporte de ' . $userdata->nombre . ' a ' . $userdata->mail . ' (' . getUserHash($userdata->rowid) . ').');
    $linkreporte = APP_URL . '/?uid=' . getUserHash($userdata->rowid);
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->AuthType   = 'XOAUTH2';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $provider = new Google([
            'clientId'     => GOOGLE_CLIENT_ID,
            'clientSecret' => GOOGLE_CLIENT_SECRET,
        ]);

        $mail->setOAuth(new OAuth([
            'provider'     => $provider,
            'clientId'     => GOOGLE_CLIENT_ID,
            'clientSecret' => GOOGLE_CLIENT_SECRET,
            'refreshToken' => GOOGLE_REFRESH_TOKEN,
            'userName'     => EMAIL_SENDER,
        ]));

        $mail->setFrom(EMAIL_SENDER, EMAIL_SENDER_NAME);
        $mail->addAddress($userdata->mail);

        $nombre = htmlspecialchars($userdata->nombre, ENT_QUOTES, 'UTF-8');
        $mail->isHTML(true);
        $mail->Subject = 'Reporte de Evaluacion 360';
        $mail->Body    = '<html><body>'
            . '<p style="color: #369">Hola ' . $nombre . ', el reporte de la evaluaci&oacute;n 360 ya se ha generado.</p>'
            . '<p>Puedes acceder al informe a trav&eacute;s del siguiente link: '
            . '<a href="' . htmlspecialchars($linkreporte, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($linkreporte, ENT_QUOTES, 'UTF-8') . '</a>'
            . '</p></body></html>';

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('El mail no pudo enviarse. Error: ' . $mail->ErrorInfo);
        return false;
    }
}
