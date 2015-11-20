/**
 * Display toast message
 */
var showToast = function (text) {
    if ($('#toast').css('display') === 'none') {
        // Prevent showing toast multiple times due to
        // multiple clicks
        $('#toast').html(text);
        $('#toast').fadeIn(300);
        window.setTimeout(function () {
            $('#toast').fadeOut(300);
        }, 3000);
    }
};

$(document).ready(function () {
    $('#toast').click(function () {
        $('#toast').fadeOut(300);
    })
});
