<?php

define('APP_URL',             rtrim(getenv('APP_URL') ?: 'http://localhost:8088/evaluacion-360', '/'));
define('ORG_NAME',            getenv('ORG_NAME') ?: 'Evaluación 360');
define('EMAIL_SENDER',        getenv('EMAIL_SENDER') ?: '');
define('EMAIL_SENDER_NAME',   getenv('EMAIL_SENDER_NAME') ?: ORG_NAME);
define('GOOGLE_CLIENT_ID',    getenv('GOOGLE_CLIENT_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '');
define('GOOGLE_REFRESH_TOKEN', getenv('GOOGLE_REFRESH_TOKEN') ?: '');
define('APP_HASH_SALT',       getenv('APP_HASH_SALT') ?: '');
define('ADMIN_PASSWORD_HASH', getenv('ADMIN_PASSWORD_HASH') ?: '');
