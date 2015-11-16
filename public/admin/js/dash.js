$(document).ready(function () {
    // Setup floating '+' button and its label
    $('#action a').hover(function () {
        // Display when hover
        var offset = $('#action a').offset();
        var heightDiff = ($('#action a').height() - $('#addQuestionLabel').height()) / 3;

        $('#addQuestionLabel').css({
            top: offset.top + heightDiff + 'px',
            left: offset.left - $('#addQuestionLabel').width() - 30 + 'px'
        });

        $('#addQuestionLabel').fadeIn(170);
    }, function () {
        // Hide when mouse leave
        $('#addQuestionLabel').fadeOut(170);
    });
});
