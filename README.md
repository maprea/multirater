# multirater
360 Feedback report generator from Google Forms

## Ejecucion con docker

1. Copiar archivo [.env.example](.env.example) a un archivo [.env] y configurar las variables.

2. Ejecutar con docker compose

```bash
sudo docker-compose build
sudo docker-compose up
```

3. Actualizar refresh token de google para envio de mails (si es necesario), accediendo a la página `admin/vendor/PHPMailer/get_oauth_token.php`.

4. Editar la nueva variable en el [.env] con los datos obtenidos en el paso previo y relanzar.

```bash
sudo docker-compose down
sudo docker-compose up -d
```