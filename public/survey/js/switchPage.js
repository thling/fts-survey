var disableComponents = function () {
    $('#next').addClass('disabled grey-text');
    $('#prev').addClass('disabled');
};

var enableComponents = function () {
    $('#next').removeClass('disabled grey-text');
    $('#prev').removeClass('disabled');
};

var registerNextButtonClickHandler = function () {
    $('#next').click(function () {
        disableComponents();
        $.get('/next', function (data) {
            $('#footer').fadeOut(300);
            $('#contents').fadeOut(300, function () {
                $('#contents').empty();
                $('#contents').append(data);
                $('#contents').fadeIn(300);
                $('#footer').fadeIn(300);
                enableComponents();
            });
        }).fail(function () {
            showToast('Failed to get next page; please refresh and try again.');
        });
    });
};
