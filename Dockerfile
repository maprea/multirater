FROM php:8.2-apache as base

RUN docker-php-ext-install opcache \
    && echo "DirectoryIndex index.php index.html" >> /etc/apache2/apache2.conf

COPY --chown=www-data ./public /var/www/html/evaluacion-360

RUN mkdir -p /var/www/html/evaluacion-360/admin/data \
    && chown -R www-data:www-data /var/www/html/evaluacion-360/admin/data
