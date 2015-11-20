$(document).ready(function () {
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Set button as disabled to avoid double click
        $('#login').addClass('disabled');

        var username = $('#username').val();
        var password = $('#password').val();

        $.post('/admin/auth', {
            username: username,
            password: password
        }, function (data) {
            // Process the redirect
            window.location.assign(data.redirect);
        }).fail(function() {
            showToast('Invalid username or password');

            // Set button active again
            $('#login').removeClass('disabled');
        });
    });
});
