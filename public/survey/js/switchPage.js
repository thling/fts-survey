var disableComponents = function () {
    $('#next').addClass('disabled grey-text');
    $('#prev').addClass('disabled');
};

var enableComponents = function () {
    $('#next').removeClass('disabled grey-text');
    $('#prev').removeClass('disabled');
};

var registerNextButtonClickHandler = function () {
    $('#next, #startPrompt').click(function () {
        disableComponents();
        $.get('/next', function (data) {
            if (data.ok) {
                // Replace the contents
                $('#footer').fadeOut(300);
                $('#contents').fadeOut(300, function () {
                    $('#contents').empty();
                    $('#contents').append(data.contents);
                    $('#contents').fadeIn(300);
                    $('#footer').fadeIn(300);
                });
            } else {
                showToast(data.message);
            }

            enableComponents();
        }).fail(function () {
            showToast('Failed to get next page; refreshing...');
            setTimeout(function () {
                window.location.assign('/');
            }, 1000);
        });
    });
};

var registerPrevButtonClickHandler = function () {
    $('#prev').click(function () {
        disableComponents();
        $.get('/prev', function (data) {
            if (data.ok) {
                // Replace the contents
                $('#footer').fadeOut(300);
                $('#contents').fadeOut(300, function () {
                    $('#contents').empty();
                    $('#contents').append(data.contents);
                    $('#contents').fadeIn(300);
                    $('#footer').fadeIn(300);
                });
            } else {
                showToast(data.message);
            }

            enableComponents();
        }).fail(function (data) {
            showToast('Failed to get previous page; refreshing...');
            setTimeout(function () {
                window.location.assign('/');
            }, 1000);
        });
    });
};
