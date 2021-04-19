$(document).ready(function() {

    /**
     * Popup de las instrucciones
     */
    $("#instructions-modal").modal('show');

    /**
     * Carga de resultados
     */

    // Evento para actualizar nombre file en upload modal
    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });

    // Evento para cargar resultados
    $('#upload-form').on('submit', function(e) {
        e.preventDefault();
        $("#upload-results").hide();
        $.ajax({
                url: "upload.php",
                type: "POST",
                data:  new FormData(this),
                contentType: false,
                cache: false,
                processData:false,
                success: function(data) {
                    let ret = jQuery.parseJSON(data);
                    if (ret.status == 'ok') {
                        $("#upload-results").attr('class', 'alert alert-success');
                        $("#upload-results span").html('Carga de resultados correcta!');
                        // Validacion de resultados
                        validateAndLoadResults();
                    } else {
                        $("#upload-results").attr('class', 'alert alert-danger');
                        $("#upload-results span").html(ret.msg);
                    }
                    $("#upload-results").show();
                },
                error: function(e) {
                    $("#upload-results span").html(e);
                    $("#upload-results").show();
                }
        });
        $('#upload-form').get(0).reset();
    });


    // Validacion de resultados (onload)
    validateAndLoadResults();

    // Actualizar asignaciones
    $('#actualizar-asignaciones-btn').on('click', function() {
        if ($(this).hasClass('disabled')) {
            $('#actualizar-asignaciones-msg').html('Hay asignaciones duplicadas.');
            $('#actualizar-asignaciones-msg').attr('class', 'text-warning pr-2');
            return false;
        }
        $.post({
            url: 'response.php',
            data: $("#actualizar-asignaciones-form").serialize() + '&accion=asignar-nombres',
            success: function(data) {
                let ret = jQuery.parseJSON(data);
                if (ret.status == 'ok') {
                    $('#actualizar-asignaciones-msg').html('Asginaciones actualizadas');
                    $('#actualizar-asignaciones-msg').attr('class', 'text-success pr-2');
                } else {
                    $('#actualizar-asignaciones-msg').html(ret.msg);
                    $('#actualizar-asignaciones-msg').attr('class', 'text-warning pr-2');
                }
            }
        });
    });

    /**
     * Generar y enviar reportes
     */
    $('#generar-reportes-link').on('click', function() {
        $.post({
            url: 'response.php',
            data:  { accion: 'generar-reportes' },
            success: function(data) {
                let ret = jQuery.parseJSON(data);
                if (ret.status != 'ok') {
                    $('#reports-user-content').html('No se pueden generar los reportes sin tener validación ok.<br>' + ret.msg);
                } else {
                   // Validacion ok, continua mostrando form
                   var usersdata = '';
                    $.each(ret.users, function(i, item) {
                        selectid = i;
                        nombrepreguntas = item.nombre_preguntas;
                        usersdata += '<tr><td>' + item.nombre + '</td><td>' + item.mail + '</td>';
                        usersdata += '<td>' + item.nombre_preguntas + '</td>';
                        usersdata += '<td><input type="checkbox" name="userid[]" value="' + item.rowid + '" class="form-check-input" id="' + item.rowid + '"></td></tr>';
                    });
                    $('#tabla-reportes tbody').html(usersdata);
                }
            }
        });

        $("#reports-results").hide();
        $("#reports-modal").modal('show');
    });

    // Evento para enviar reportes
    $('#reports-form').on('submit', function(e) {
        e.preventDefault();
        $("#reports-results").hide();
        $.post({
            url: 'response.php',
            data: $("#reports-form").serialize() + '&accion=enviar-reportes',
            success: function(data) {
                let ret = jQuery.parseJSON(data);
                if (ret.status == 'ok') {
                    $("#reports-results").attr('class', 'alert alert-success');
                } else {
                    $("#reports-results").attr('class', 'alert alert-danger');
                }
                $("#reports-results").html(ret.msg);
                $("#reports-results").show();
            }
        });
        
        
        $('#reports-form').get(0).reset();
    });

    // Activa tooltips
    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })
  });

/**
 * Validación de resultados
 */
validateAndLoadResults = function() {
    $.post({
        url: 'response.php',
        data:  { accion: 'validar' },
        success: function(data) {
            let ret = jQuery.parseJSON(data);
            if (ret.status == 'ok') {
                $("#validation-msg").attr('class', 'alert alert-success');
            } else {
                $("#validation-msg").attr('class', 'alert alert-danger');
            }
            $("#validation-msg").html(ret.msg);

            // Carga datos de usuaries
            var usersdata = '';
            $.each(ret.users, function(i, item) {
                selectid = i;
                nombrepreguntas = item.nombre_preguntas;
                usersdata += '<tr><td>' + item.nombre + '</td><td>' + item.mail + '</td><td>';
                usersdata += '<select class="form-control users_pregs_select" name="' + selectid + '" id="' + selectid + '"';
                usersdata += 'onchange="validateAssignedUsers();">';
                $.each(ret.users_en_preguntas, function(i, item) {
                    if (nombrepreguntas == item) {
                        usersdata += '<option selected value="' + item + '">' + item + '</option>';
                    } else {
                        usersdata += '<option value="' + item + '">' + item + '</option>';
                    }
                });
                usersdata += '</select></td></tr>';
            });
            $('#tabla-users tbody').html(usersdata);
            asignacionesOk = validateAssignedUsers();

            // Carga datos de preguntas
            var qdata = '';
            $.each(ret.preguntas, function(i, item) {
                qdata += '<tr><td>' + item.id + '</td>';
                qdata += '<td>' + item.titulo + '</td>';
                qdata += '<td>' + item.descripcion + '</td>';
                spanclass = 'class="text-success"';
                if (ret.users.length != item.cant_opciones) {
                    spanclass = 'class="text-danger"';
                }
                qdata += '<td ' + spanclass + '>' + item.cant_opciones + '</td></tr>';
            });
            $('#tabla-preguntas tbody').html(qdata);

            // Activa generacion de reportes
            if (ret.status == 'ok' && asignacionesOk) {
                $('#generar-reportes-link').removeClass('disabled');
            } else {
                $('#generar-reportes-link').addClass('disabled');
            }
        }
    });
}

// Valida las dropdown de las asignaciones de usuaries
validateAssignedUsers = function() {
    let usrs = [];
    $('.users_pregs_select').each(function(i) {
        usrs.push($(this).val());
    });
    usrs_unique = usrs.filter((c, index) => {
        return usrs.indexOf(c) === index;
    });
    valid = usrs.length == usrs_unique.length;
    if (valid) {
        $('#actualizar-asignaciones-btn').removeClass('disabled');
    } else {
        $('#actualizar-asignaciones-btn').addClass('disabled');
    }
    return valid;
}