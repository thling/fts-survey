var debug = false;

/**
 * Display error message
 */
var showToast = function (text) {
    if ($('#toast').css('display') === 'none') {
        // Prevent showing toast multiple times due to
        // multiple clicks
        $('#toast').html(text);
        $('#toast').fadeIn(300).delay(3000).fadeOut(300);
    }
};

$(document).ready(function () {
    $('body').fadeIn(300);

    // Auto adjust the start button position on the landing page
    $(window).resize(function () {
        var winWidth = $(window).width();
        var winHeight = $(window).height();
        var prompt = $('#startPrompt');
        prompt.css({
            left: (winWidth - prompt.width()) / 2,
            top: (winHeight - prompt.height()) / 2
        });
    });

    $(window).trigger('resize');

    $('#startScreen').click(function () {
        $(this).delay(50).fadeOut(200, function () {
            $(this).remove();
        });
    });

    registerNextButtonClickHandler();
    registerPrevButtonClickHandler();

    if (debug) {
        $("#startScreen").trigger('click');
    }
});
