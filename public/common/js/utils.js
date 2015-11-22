/**
 * Display toast message
 */
var showToast = function (text) {
    var toast = $('#toast');
    if (toast && toast.css('opacity') === '0') {
        // Prevent showing toast multiple times due to
        // multiple clicks
        toast.html(text);
        toast.css('top', '10px');
        toast.animate({
            top: '20px',
            opacity: 1
        }, 200);

        window.setTimeout(function () {
            toast.animate({
                top: '40px',
                opacity: 0
            })
        }, 3000);
    }
};

$(document).ready(function () {
    $('#toast').click(function () {
        $(this).animate({
            top: '40px',
            opacity: 0
        }, 200);
    })
});
