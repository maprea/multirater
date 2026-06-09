// Escapes a value for safe insertion into HTML
const esc = s => $('<span>').text(String(s ?? '')).html();

$(document).ready(function() {

    $("#instructions-modal").modal('show');

    /* ─── File upload ──────────────────────────────────────────────────────── */

    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });

    $('#upload-form').on('submit', function(e) {
        e.preventDefault();
        $("#upload-results").hide();
        $.ajax({
            url: "upload.php",
            type: "POST",
            data: new FormData(this),
            contentType: false,
            cache: false,
            processData: false,
            success: function(data) {
                let ret = jQuery.parseJSON(data);
                if (ret.status == 'ok') {
                    $("#upload-results").attr('class', 'alert alert-success');
                    $("#upload-results span").html('Carga de resultados correcta!');
                    validateAndLoadResults();
                } else {
                    $("#upload-results").attr('class', 'alert alert-danger');
                    $("#upload-results span").html(esc(ret.msg));
                }
                $("#upload-results").show();
            },
            error: function(e) {
                $("#upload-results span").html('Error al comunicarse con el servidor.');
                $("#upload-results").show();
            }
        });
        $('#upload-form').get(0).reset();
    });

    validateAndLoadResults();

    /* ─── Name assignments ─────────────────────────────────────────────────── */

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
                    $('#actualizar-asignaciones-msg').html('Asignaciones actualizadas');
                    $('#actualizar-asignaciones-msg').attr('class', 'text-success pr-2');
                } else {
                    $('#actualizar-asignaciones-msg').html(esc(ret.msg));
                    $('#actualizar-asignaciones-msg').attr('class', 'text-warning pr-2');
                }
            }
        });
    });

    /* ─── Report generation and sending ───────────────────────────────────── */

    $('#generar-reportes-link').on('click', function() {
        $.post({
            url: 'response.php',
            data: { accion: 'generar-reportes' },
            success: function(data) {
                let ret = jQuery.parseJSON(data);
                if (ret.status != 'ok') {
                    $('#reports-user-content').html('No se pueden generar los reportes sin tener validación ok.<br>' + esc(ret.msg));
                } else {
                    var usersdata = '';
                    $.each(ret.users, function(i, item) {
                        usersdata += '<tr><td>' + esc(item.nombre) + '</td><td>' + esc(item.mail) + '</td>';
                        usersdata += '<td>' + esc(item.nombre_preguntas) + '</td>';
                        usersdata += '<td><input type="checkbox" name="userid[]" value="' + esc(item.rowid) + '" class="form-check-input" id="' + esc(item.rowid) + '"></td></tr>';
                    });
                    $('#tabla-reportes tbody').html(usersdata);
                }
            }
        });

        $("#reports-results").hide();
        $("#reports-modal").modal('show');
    });

    $('#reports-form').on('submit', function(e) {
        e.preventDefault();
        $("#reports-submit").attr("disabled", true);
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
                $("#reports-results").html(esc(ret.msg));
                $("#reports-results").show();
                $("#reports-submit").attr("disabled", false);
            }
        });
        $('#reports-form').get(0).reset();
    });

    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });
});


/* ─── Validation ───────────────────────────────────────────────────────────── */

validateAndLoadResults = function() {
    $.post({
        url: 'response.php',
        data: { accion: 'validar' },
        success: function(data) {
            let ret = jQuery.parseJSON(data);
            if (ret.status == 'ok') {
                $("#validation-msg").attr('class', 'alert alert-success');
            } else {
                $("#validation-msg").attr('class', 'alert alert-danger');
            }
            $("#validation-msg").html(ret.msg);

            var usersdata = '';
            $.each(ret.users, function(i, user) {
                let selectid = i;
                let nombrepreguntas = user.nombre_preguntas;
                usersdata += '<tr><td>' + esc(user.nombre) + '</td><td>' + esc(user.mail) + '</td><td>';
                usersdata += '<select class="form-control users_pregs_select" name="' + esc(selectid) + '" id="' + esc(selectid) + '"';
                usersdata += 'onchange="validateAssignedUsers();">';
                $.each(ret.users_en_preguntas, function(i, nombre) {
                    if ((nombrepreguntas && nombrepreguntas == nombre) || (user.nombre == nombre)) {
                        usersdata += '<option selected value="' + esc(nombre) + '">' + esc(nombre) + '</option>';
                    } else {
                        usersdata += '<option value="' + esc(nombre) + '">' + esc(nombre) + '</option>';
                    }
                });
                usersdata += '</select></td></tr>';
            });
            $('#tabla-users tbody').html(usersdata);
            let asignacionesOk = validateAssignedUsers();

            var qdata = '';
            $.each(ret.preguntas, function(i, item) {
                qdata += '<tr><td>' + esc(item.id) + '</td>';
                qdata += '<td>' + esc(item.titulo) + '</td>';
                qdata += '<td>' + esc(item.descripcion) + '</td>';
                let spanclass = 'class="text-success"';
                if (ret.users.length != item.cant_opciones) {
                    spanclass = 'class="text-danger"';
                }
                qdata += '<td ' + spanclass + '>' + esc(item.cant_opciones) + '</td></tr>';
            });
            $('#tabla-preguntas tbody').html(qdata);

            if (ret.status == 'ok' && asignacionesOk) {
                $('#generar-reportes-link').removeClass('disabled');
            } else {
                $('#generar-reportes-link').addClass('disabled');
            }
        }
    });
}

validateAssignedUsers = function() {
    let usrs = [];
    $('.users_pregs_select').each(function(i) {
        usrs.push($(this).val());
    });
    let usrs_unique = usrs.filter((c, index) => usrs.indexOf(c) === index);
    let valid = usrs.length == usrs_unique.length;
    if (valid) {
        $('#actualizar-asignaciones-btn').removeClass('disabled');
    } else {
        $('#actualizar-asignaciones-btn').addClass('disabled');
    }
    return valid;
}
