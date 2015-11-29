// Currently used tracker
var _current = undefined;
// The graphics context of the current canvas
var _ctx = undefined;
// The number of coordinates each submission should be
var _chunkSize = 1000;

/**
 * Handler for failed ajax requests
 *
 * @param   xhr     Response body
 * @param   status  Text description of fail status (e.g. 'error' or 'timeout')
 * @param   error   The error string indicated by HTTP code
 */
var failHandler = function(xhr, status, error) {
    showToast(xhr.responseText);
};

/**
 * Upload coordinates in batch
 *
 * @param   coords          The remaining coordinates to upload
 * @param   len             Number of items to upload from coords
 * @param   trackerIndex    The index of the tracker in database for this
 *                          particular tracker
 */
var pushCoords = function (coords, len, trackerIndex) {
    if (coords.length === 0) {
        return;
    }

    var toSend = coords.slice(0, len);

    $.ajax({
        url: '/coords/' + trackerIndex,
        type: 'PUT',
        data: { coords: JSON.stringify(toSend) }
    }).done(function (data) {
        // Recursively call the function in callback to simulate
        // synchronous upload
        pushCoords(coords.slice(len), len, trackerIndex);
    }).fail(failHandler);
};

/**
 * Submits the tracker to the server
 *
 * @param   tracker     The object to save to database
 */
var submitTracker = function (tracker) {
    var origMouse = tracker.mouse;
    var newMouse = origMouse.slice(0, _chunkSize);

    tracker.mouse = newMouse;
    $.ajax({
        url: '/records',
        type: 'PUT',
        data: { data: JSON.stringify(tracker) }
    }).done(function (data) {
        pushCoords(origMouse.slice(_chunkSize), _chunkSize, data.trackerIndex);
    }).fail(failHandler);
};

/**
 * Resets tracker object
 *
 * @param   objectId    The id of the question
 * @param   curAnswer   The current answer if previously answered
 */
var resetTracker = function (objectId, curAnswer) {
    _current = {
        questionId: objectId,
        answer: {
            old: curAnswer || '',
            new: ''
        },
        startTime: (new Date()).getTime(),
        endTime: undefined,
        mouse: []
    };

    // Reset canvas
    $(window).trigger('resize');
};

/**
 * Finalise tracker and submit it
 *
 * @param   newAnswer   The new answer to finalise this tracker with
 */
var finaliseTracker = function (newAnswer) {
    if (_current && _current.questionId && newAnswer) {
        _current.answer.new = newAnswer;
        _current.endTime = (new Date()).getTime();

        // Deep copy to avoid accidentally modifying
        // object during async ajax call
        var tmp = {}
        $.extend(true, tmp, _current);
        submitTracker(tmp);
    }
};

/**
 * Retireve answer for the question item
 *
 * @param   element The element that contains answers field
 * @return  The answer provided to this element
 */
var getAnswer = function (element) {
    var ans = '';
    var children = element.find('input');
    if (children && children.length > 1) {
        // Multiple choice type question
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child && $(child).prop('checked')) {
                ans = $('label[for=' + $(child).attr('id') + ']').text();
                break;
            }
        }
    } else if (children && children.length === 1){
        // Short answer type question
        ans = children.val();
    }

    return ans;
}

/**
 * Add canvas for mouse trace
 */
var createCanvas = function () {
    var canvas = $('<canvas id="mousepaths"></canvas>');
    canvas.css({
    });

    $('body').append(canvas);

    // Register canvas event handlers

    // Window resize will trigger resize of the canvas
    $(window).resize(function () {
        var c = document.getElementById('mousepaths').getContext('2d');
        canvas.width($(document).width());
        canvas.height($(document).height());
        c.canvas.width = $(document).width();
        c.canvas.height = $(document).height();
        _ctx = undefined;
    });

    // If CTRL + ALT is pressed, show the mouse track
    $(window).keydown(function (e) {
        this.ctrlKeyDown = this.ctrlKeyDown || (e.keyCode === 17);
        this.altKeyDown = this.altKeyDown || (e.keyCode === 18);

        if (this.ctrlKeyDown && this.altKeyDown) {
            $('#mousepaths').animate({
                'opacity': '1'
            }, 150);
        }
    });

    // If CTRL + ALT is released, hide the mouse track
    $(window).keyup(function (e) {
        this.ctrlKeyDown = (e.keyCode === 17)? false : this.ctrlKeyDown;
        this.altKeyDown = (e.keyCode === 18)? false : this.altKeyDown;

        if (!this.ctrlKeyDown || !this.altKeyDown) {
            $('#mousepaths').animate({
                'opacity': '0'
            }, 150);
        }
    });

    // Move the canvas if scrolled
    $(window).scroll(function (e) {
        $('#mousepaths').css('top', -($(window).scrollTop()) + 'px');
    });

    // Draw lines on the canvas
    $(window).mousemove(function (e) {
        if (!_ctx) {
            _ctx = document.getElementById('mousepaths').getContext('2d');
            _ctx.lineWidth = 3;
            _ctx.strokeStyle = 'red';
            _ctx.beginPath();
            _ctx.moveTo(e.pageX, e.pageY);
        }

        _ctx.lineTo(e.pageX, e.pageY);
        _ctx.stroke();

        if (_current) {
            // Add coordinates to tracked item
            _current.mouse.push([ e.pageX, e.pageY ]);
        }
    });
}

/**
 * Binds a tracker to an element
 *
 * @param   element     The element currently tracking
 */
var bindTracker = function (element) {
    if (!element) {
        console.error('Cannot find element');
        return;
    }

    if (!_current) {
        // If _current is undefined then we haven't binded
        // mouse listener to window
        createCanvas();

        window.setTimeout(function () {
            $(window).trigger('resize');
        }, 500);
    }

    // Wrap with jQuery
    var ele = $(element);
    if (_current) {
        finaliseTracker(getAnswer($('li[objectId=' + _current.questionId + ']')));
    }

    resetTracker(ele.attr('objectId'), getAnswer(ele));
};
