var disableComponents = function () {
    $('#next').addClass('disabled grey-text');
    $('#prev').addClass('disabled');
};

var enableComponents = function () {
    $('#next').removeClass('disabled grey-text');
    $('#prev').removeClass('disabled');
};

/**
 * Creates a handler method that handles the ajax call
 * for the specified URL.
 *
 * @param   url     The URL to send GET request to
 * @param   success The handler for success request
 * @param   fail    The handler for failed request
 */
var navigationAdapter = function (url, success, fail) {
    return function () {
        disableComponents();
        $.get(url, function (data) {
            if (data.ok) {
                // Replace the contents
                $('#footer').fadeOut(300);
                $('#contents').fadeOut(300, function () {
                    $('#contents').empty();
                    $('#contents').append(data.contents);
                    $('#contents').fadeIn(300);
                    if (data.actionButtons === undefined) {
                        $('#prev').css('display', 'default');
                        $('#next').css('display', 'default');
                        $('#footerDivider').css('display', 'default');
                        $('#prev').html('Previous');
                        $('#next').html('Next');
                    } else if (data.actionButtons === false){
                        $('#prev').css('display', 'none');
                        $('#next').css('display', 'none');
                        $('#footerDivider').css('display', 'none');
                        $('#prev').html('Go back');
                        $('#next').html('Consent');
                    } else {
                        $('#prev').css('display', 'default');
                        $('#next').css('display', 'default');
                        $('#footerDivider').css('display', 'default');
                        $('#prev').html(data.actionButtons[1]);
                        $('#next').html(data.actionButtons[0]);
                    }

                    $('#footer').fadeIn(300);
                    if (success !== undefined) {
                        success();
                    }

                    // End of study
                    if (data.end) {
                        console.log('ending stuffs');
                        var navItems = $('.navItem');
                        for (var i = 0; i < navItems.length - 1; i++) {
                            $(navItems[i]).delay(i * 30 + 350).slideUp(300, function () {
                                $(this).remove();
                            });
                        }
                    }
                });
            } else {
                // Display the error message
                showToast(data.message);
                if (fail != undefined) {
                    fail();
                }
            }

            enableComponents();
        }).fail(function (data) {
            // Something fatal happend (server did not respond 2xx code)
            // Prompt user and refresh
            showToast('Failed to get previous page; refreshing...');
            setTimeout(function () {
                window.location.assign('/');
            }, 1000);
        });
    };
};

/**
 * Switches the highlighted navigation button
 *
 * @param   index   The new item to switch to
 */
var switchSelected = function (index) {
    return function () {
        var newItem = $('.navItem[index=' + index + ']');
        if (newItem) {
            $('.selected').removeClass('selected');
            newItem.addClass('selected');
        }
    }
};

var registerNextButtonClickHandler = function () {
    $('#startPrompt').click(function () {
        if (!$(this).attr('disabled')) {
            $(this).attr('disabled', 'true');
            navigationAdapter('/next')();
        }
    });

    $('#next').click(function () {
        var newIndex = parseInt($('.selected').attr('index')) + 1;
        navigationAdapter('/next', switchSelected(newIndex))();
    });
};

var registerPrevButtonClickHandler = function () {
    $('#prev').click(function () {
        var newIndex = parseInt($('.selected').attr('index')) - 1;
        navigationAdapter('/prev', switchSelected(newIndex))();
    });
};

var registerNaviButtonClickHandler = function () {
    $('.navItem').click(function () {
        if ($(this).hasClass('selected')) {
            return;
        }

        var newIndex = $(this).attr('index');
        navigationAdapter('/page/' + newIndex, switchSelected(newIndex))();
    });
}
