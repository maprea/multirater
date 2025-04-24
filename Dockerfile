FROM php:7.0-apache as base

COPY --chown=www-data ./public /var/www/html/evaluacion-360

RUN mkdir -p /var/www/html/evaluacion-360/admin/data \
    && chown -R www-data:www-data /var/www/html/evaluacion-360/admin/data