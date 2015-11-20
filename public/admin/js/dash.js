/**
 * Handler for mouse hover event for #addQuestionTrigger
 */
var addQuestionHoverHandler = function () {
    // Display when hover
    var offset = $('#addQuestionTrigger').offset();
    var heightDiff = ($('#addQuestionTrigger').height()
            - $('#addQuestionLabel').height())
            / 3;

    $('#addQuestionLabel').css({
        top: offset.top + heightDiff + 'px',
        left: offset.left - $('#addQuestionLabel').width() - 30 + 'px'
    });

    $('#addQuestionLabel').fadeIn(170);
};

/**
 * Reset all values (set to empty)
 */
var cleanModalInputs = function () {
    $('#questionTitle').val('');
    $('#questionDescription').val('');
    $('#shortAnswer').attr('checked', false);
    $('#multipleChoice').attr('checked', false);

    // Reset multiple choice list, removing all
    // other items except for one
    var choices = $('.mcChoices');
    $('#mcChoice1').val('');
    for (var i = 2; i <= choices.length; i++) {
        $('#mcChoice' + i).parent().remove();
    }

    $('#multipleChoiceAnswerList').css('display', 'none');
};

/**
 * Enables all input elements on the form
 */
var enableForm = function () {
    $('#questionTitle').removeAttr('disabled');
    $('#questionDescription').removeAttr('disabled');
    $('#shortAnswer').removeAttr('disabled');
    $('#multipleChoice').removeAttr('disabled');

    var choices = $('.mcChoices');
    for (var i = 1; i <= choices.length; i++) {
        $('#mcChoice' + i).removeAttr('disabled');
    }

    $('#saveButton').removeClass('disabled');
    $('#cancelButton').removeClass('disabled');
    $('#addMoreChoice').removeClass('disabled');
};

/**
 * Disable all inputs
 */
var disableForm = function () {
    $('#questionTitle').attr('disabled', '');
    $('#questionDescription').attr('disabled', '');
    $('#shortAnswer').attr('disabled', '');
    $('#multipleChoice').attr('disabled', '');

    var choices = $('.mcChoices');
    for (var i = 1; i <= choices.length; i++) {
        $('#mcChoice' + i).attr('disabled', '');
    }

    $('#saveButton').addClass('disabled');
    $('#cancelButton').addClass('disabled');
    $('#addMoreChoice').addClass('disabled');
};

/**
 * Upload the data to server
 */
var postQuestion = function (question, cb) {
    $.post('/admin/questions', question, function (data) {
        cb(true);
    }).fail(function (err) {
        showToast('Submit failed: ' + err.message);
        cb(false);
    });
};

/**
 * Validates data, triggers form submission
 */
var saveQuestion = function () {
    disableForm();

    var data = {};
    data.title = $('#questionTitle').val();
    if (!data.title || data.title === '' || data.title.length === 0) {
        // Check if no title is provided
        showToast('Title cannot be empty!');
        enableForm();
        return;
    }

    data.description = $('#questionDescription').val();
    if (!data.description || data.description === ''
            || data.description.length === 0) {
        // Check if no description is provided
        showToast('Description cannot be empty!');
        enableForm();
        return;
    }

    if (!$('#multipleChoice').is(':checked')
            && !$('#shortAnswer').is(':checked')) {
        // Check if no answer type was selected
        showToast('Please select an answer type!');
        enableForm();
        return;
    }

    if ($('#multipleChoice').is(':checked')) {
        data.answers = [];
        var choices = $('.mcChoices');
        for (var i = 1; i <= choices.length; i++) {
            var c = $('#mcChoice' + i).val();
            if (!c || c === '' || c.length === 0) {
                // Ignore choice option if empty
                continue;
            }

            data.answers.push(c);
        }

        if (data.answers.length < 2) {
            // Otherwise it wouldn't be multiple choice...
            showToast('Multiple choice must have at least 2 choices!');
            enableForm();
            return;
        }
    }

    postQuestion(data, function (result) {
        if (result) {
            cleanModalInputs();
            $('#addQuestionDialog').closeModal();
            enableForm();
            window.location.reload(true);
        } else {
            enableForm();
        }
    });
};

var initialiseModal = function () {
    $('.modal-trigger').leanModal({
        dismissible: false, // Modal can be dismissed by clicking outside of the modal
        opacity: 0.5, // Opacity of modal background
        in_duration: 200, // Transition in duration
        out_duration: 200
    });

    // Question modal
    $("#multipleChoice").change(function () {
        $("#multipleChoiceAnswerList").slideDown(200);
    });

    $("#shortAnswer").change(function () {
        $("#multipleChoiceAnswerList").slideUp(200);
    });

    $("#addMoreChoice").click(function() {
        // Allows dynamically adding more buttons
        var choices = $(".mcChoices");
        var next = choices.length + 1;

        var newItem = $(
            '<div class="input-field col s12 mcChoices" style="display: none">'
                + '<input id="mcChoice' + next + '" type="text" class="validate">'
                + '<label for="mcChoice' + next + '">Choice ' + next + '</label>'
            + '</div>'
        );

        newItem.insertAfter(choices[choices.length - 1]);
        newItem.slideDown(200);
    });

    $("#saveButton").click(saveQuestion);
    $("#cancelButton").click(function () {
        cleanModalInputs();
        $('#addQuestionDialog').closeModal();
    });
};

var deleteQuestion = function (e) {
};

$(document).ready(function () {
    // Setup floating '+' button and its label
    $('#addQuestionTrigger').hover(addQuestionHoverHandler, function () {
        // Hide when mouse leave
        $('#addQuestionLabel').fadeOut(170);
    });

    initialiseModal();

    $('.deleteQuestion').click(function (e) {
        var confirmed = confirm('Delete this question?');
        if (confirmed) {
            var objectId = $(this).attr('objectId');
            $.ajax({
                url: '/admin/questions',
                type: 'DELETE',
                data: { id: objectId }
            }).done(function (data) {
                window.location.reload(true);
            }).fail(function () {
                showToast('There was a problem while deleting')
            });
        }
    });

});
