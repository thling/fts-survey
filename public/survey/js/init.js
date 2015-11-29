var debug = false;

$(document).ready(function () {
    $('body').fadeIn(300);

    // Auto adjust the start button position on the landing page
    $(window).resize(function () {
        var winWidth = $(window).width();
        var winHeight = $(window).height();
        var prompt = $('#startPrompt');
        prompt.css({
            left: (winWidth - prompt.width()) / 2 - 10,
            top: (winHeight - prompt.height()) / 2
        });
    });

    $(window).trigger('resize');

    // Register navigator
    registerNextButtonClickHandler();
    registerPrevButtonClickHandler();
    registerNaviButtonClickHandler();

    // Beautifying the bold start button
    $('#startPrompt').click(function () {
        $('#startScreen').delay(50).fadeOut(200, function () {
            $(this).remove();
        });

        var navItems = document.getElementsByClassName('navItem');
        for (var i = 0; i < navItems.length; i++) {
            var item = $(navItems[i]);
            item.delay(200 + (i + 1) * 150).animate({
                opacity: 1
            }, 600);
        }
    });

    $('#startPrompt').hover(function () {
        $(this).animate({
            backgroundColor: 'yellow',
            color: '#004d40'
        }, 150);
    }, function () {
        $(this).animate({
            backgroundColor: '#004d40',
            color: 'yellow'
        }, 150);
    });

    if (debug) {
        $("#startScreen").trigger('click');
    }
});
