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
            console.log('failed');
            if ($('#toast').css('display') === 'none') {
                // Prevent showing toast multiple times due to
                // multiple clicks
                $('#toast').html('Invalid username or password');
                $('#toast').fadeIn(300).delay(5000).fadeOut(300);
            }

            // Set button active again
            $('#login').removeClass('disabled');
        });
    });
});
