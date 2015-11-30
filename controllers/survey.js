'use strict';

let crypto = require('crypto');
let render = require('koa-ejs');
let Answer = require('../models/Answer');
let Question = require('../models/Question');
let utils = require('../lib/utils');
let _ = require('lodash');

// Sequence of our pages
const SEQ = [
    {
        // Left empty for 'start' placeholder
    },
    {
        template: 'welcome',
        identifier: 'welcome',
        name: 'Welcome',
        index: 1
    }, {
        template: 'consent-form',
        identifier: 'consent',
        name: 'Consent Form',
        index: 2
    }, {
        template: 'questions',
        identifier: 'questions',
        name: 'Questions',
        index: 3
    }, {
        template: 'final',
        identifier: 'final',
        name: 'Complete',
        index: 4
    }
];

const CONSENT_INDEX = 2;

const TRACKER_SCHEMA = {
    questionId: '',
    answer: {
        old: '',
        new: ''
    },
    startTime: '',
    endTime: '',
    mouse: []
};

/**
 * Check if the progress counter is valid.
 *
 * @param   prog    The progress counter
 */
let isProgValid = function (prog) {
    return (prog !== undefined && Number.isInteger(prog) && prog >= 0 && prog < SEQ.length);
}

/**
 * Hash the IP. Used for consent form ID (probably need something better).
 *
 * @param   ip  The IP address to hash
 */
let getIpHash = function (ip) {
    return crypto.createHash('sha1').update(ip || "secretkey").digest('hex');;
};

/**
 * Gets an unique ID
 */
let getUniqueId = function () {
    return crypto
            .createHash('sha1')
            .update(Date.now() + 'random_secret_string')
            .digest('hex');
}

/**
 * Retrieves question list and caches them
 */
let getQuestions = function *() {
    return yield Question.find();
};

/**
 * Checks if the time is valid. The criterias are:
 *    1. Time is in the past
 *    2. Time is no earlier than 1.5 hours ago
 *
 * @param   epoch   The epoch time to check
 */
let isReasonableTime = function (epoch) {
    let cur = Date.now();
    epoch = parseInt(epoch);
    return (epoch < cur && epoch > cur - 5400000);
}

/**
 * Check if the tracker is valid and conforms to
 * the data format
 *
 * @param   tracker The tracker to validate
 */
let validateTracker = function *(tracker) {
    if (!utils.verifySchema(tracker, TRACKER_SCHEMA)) {
        console.log('Invalid schema');
        return false;
    }

    // Check if date is valid
    if (!isReasonableTime(tracker.startTime) || !isReasonableTime(tracker.endTime)) {
        console.log('Invalid date', tracker.startTime, tracker.endTime);
        return false;
    }

    // Make sure the question exists
    let question = yield Question.findOne({ _id: tracker.questionId });
    if (!question) {
        console.log('Question not exist');
        return false;
    }

    // Make sure the answers are what we asked (if multiple choice)
    if (question.answers) {
        if (tracker.answer.new !== ''
                && question.answers.indexOf(tracker.answer.new) === -1) {
            console.log('New answer not good');
            return false;
        }

        if (tracker.answer.old !== ''
                &&  question.answers.indexOf(tracker.answer.old) === -1) {
            console.log('Old answer not good');
            return false;
        }
    }

    return true;
};

/**
 * Renders and returns first page's contents.
 *
 * Sets the progress cookie to indicate the page being displayed.
 */
module.exports.render = function *() {
    yield this.regenerateSession();
    this.session.progress = 0;

    yield this.render('survey/start', {
        sequences: SEQ.slice(1)
    });
};

/**
 * Navigate to a page directly.
 */
module.exports.getPage = function *() {
    let index = parseInt(this.params.index);

    if (isProgValid(index)) {
        if (index === this.session.progress) {
            // Don't render anything if attempting to access the same page
            this.status = 200;
            return;
        }

        if (index > CONSENT_INDEX && (!this.session.consentId ||
                this.session.consentId !== getIpHash(this.request.ip))) {
            this.body = {
                ok: false,
                message: 'You need to agree to the consent form be fore continuing!'
            };
        } else if (SEQ[index].identifier === 'questions') {
            if (!this.session.sessionId) {
                // Create new answer session and assign the session an ID
                let ans = new Answer({
                    consentId: this.session.consentId,
                    trackers: []
                });

                yield ans.save();
                this.session.sessionId = ans._id;
            }

            let qs = yield getQuestions();
            this.session.progress = index;
            this.body = {
                ok: true,
                contents: yield this.render('survey/' + SEQ[index].template, { writeResp: false, questions: qs }),
                actionButtons: [ 'Submit', 'Previous' ]
            };
        } else if (SEQ[index].identifier === 'final') {
            this.body = {
                ok: false,
                message: 'Please submit your survey'
            };
        } else {
            // If everything is good then render
            this.session.progress = index;
            this.body = {
                ok: true,
                contents: yield this.render('survey/' + SEQ[index].template, { writeResp: false }),
            };
        }
    } else {
        yield this.regenerateSession();
        this.status = 400;
    }
}

/**
 * Renders and returns next page's contents.
 *
 * Uses the cookie value 'progress' to determine which
 * page to render.
 */
module.exports.getNext = function *() {
    let prog = this.session.progress;
    let nextProg = prog + 1;

    if (!isProgValid(prog)) {
        yield this.regenerateSession();
        this.status = 400;
    } else if (nextProg === SEQ.length) {
        this.body = {
            ok: false,
            message: 'You are at the last page of the survey'
        }
    } else if (prog === CONSENT_INDEX) {
        // Sets the consent cookie
        this.session.consentId = getIpHash(this.request.ip);
        this.session.progress = nextProg;

        if (!this.session.sessionId) {
            // Create new answer session and assign the session an ID
            let ans = new Answer({
                consentId: this.session.consentId,
                trackers: []
            });

            yield ans.save();
            this.session.sessionId = ans._id;
        }

        // Render the questions
        let qs = yield getQuestions();
        this.body = {
            ok: true,
            // Note: use option { writeResp: false } to tell
            // renderer to return the html, not set it in body
            contents: yield this.render('survey/' + SEQ[nextProg].template, { writeResp: false, questions: qs }),
            actionButtons: [ 'Submit', 'Previous' ]
        };
    } else if (nextProg > CONSENT_INDEX && (!this.session.consentId ||
            this.session.consentId !== getIpHash(this.request.ip))) {
        // If consentId is not set and prog is already past consent form,
        // some bad thing has happened. Redirect to first page
        yield this.regenerateSession();
        this.status = 400;
    } else if (SEQ[nextProg].identifier === 'final') {
        this.body = {
            ok: true,
            contents: yield this.render('survey/' + SEQ[nextProg].template, { writeResp: false }),
            actionButtons: false,
            end: true
        };
    } else {
        // Valid prog and has proper authorisation
        this.session.progress = nextProg;
        this.body = {
            ok: true,
            contents: yield this.render('survey/' + SEQ[nextProg].template, { writeResp: false }),
            actionButtons: (nextProg === CONSENT_INDEX)? [ 'Consent', 'Go Back' ] : undefined
        };
    }
};

/**
 * Render the previous page if valid
 */
module.exports.getPrev = function *() {
    let prog = this.session.progress;
    let prevProg = prog - 1;

    if (!isProgValid(prog)) {
        // Reset and throw error
        yield this.regenerateSession();
        this.status = 400;
    } else {
        if (prevProg > 0) {
            // Valid
            this.session.progress = prevProg;
            this.body = {
                ok: true,
                contents: yield this.render('survey/' + SEQ[prevProg].template, { writeResp: false }),
                actionButtons: (prevProg === CONSENT_INDEX)? [ 'Consent', 'Go Back' ] : undefined
            };
        } else {
            // If prevProg is 0, we don't want to go further back
            // because 0 is start page
            this.body = {
                ok: false,
                message: 'You are at the first page of the survey'
            };
        }
    }
};

/**
 * Add the submitted record to database
 */
module.exports.updateRecord = function *() {
    if (this.session.consentId !== getIpHash(this.request.ip)) {
        yield this.regenerateSession();
        this.status = 400;
        this.body = 'Please give consent to the consent form before proceeding';
        return;
    }

    // Verify we have everything good
    let data = JSON.parse(this.request.body.data);

    if (!(yield validateTracker(data))) {
        this.status = 400;
        this.body = 'Invalid data format';
        return;
    }

    // Retrieve session id
    let id = this.session.sessionId;
    if (id) {
        let ans = yield Answer.findOne({ _id: id });
        if (!ans) {
            yield this.regenerateSession();
            this.status = 400;
            this.body = 'Cannot find the session ID; make sure cookies are enable';
            return;
        }

        if (!ans.trackers) {
            ans.trackers = [];
        }

        ans.trackers.push(data);
        try {
            yield ans.save();

            // If everything goes well, we return with index of the tracker
            // in case more coordinates should be pushed
            let trackerIndex = ans.trackers.length - 1;
            this.status = 200;
            this.body = {
                trackerIndex: trackerIndex
            };
        } catch (error) {
            console.error(error.message);
            this.status = 500;
        }
    } else {
        yield this.regenerateSession();
        this.status = 400;
        this.body = 'Cannot find the session ID; make sure cookies are enabled';
    }
};

/**
 * Method for splitting mouse coordinate upload into separate batches
 * to avoid payload overlimit problem for HTTP requests.
 */
module.exports.pushCoords = function *() {
    // Check if session is valid
    if (this.session.consentId !== getIpHash(this.request.ip)) {
        yield this.regenerateSession();
        this.status = 400;
        this.body = 'Cannot find the session ID; make sure cookies are enabled';
        return;
    }

    // Check if data exists
    if (!this.request.body.coords) {
        this.status = 400;
        this.body = 'Received no payloads along request';
        return;
    }

    // Check if tracker index is provided
    let trackerIndex = this.params.index;
    if (!trackerIndex) {
        this.status = 400;
        this.body = 'No tracker index was provided';
        return;
    }

    trackerIndex = parseInt(trackerIndex);

    let data = JSON.parse(this.request.body.coords);
    let id = this.session.sessionId;

    if (id) {
        let ans = yield Answer.findOne({ _id: id });
        if (!ans) {
            // If answer does not exist
            yield this.regenerateSession();
            this.status = 400;
            this.body = 'Invalid session ID provided';
            return;
        }

        // Validate tracker index
        if (!ans.trackers || ans.trackers.length < trackerIndex + 1) {
            yield this.regenerateSession();
            this.status = 400;
            this.body = 'Invalid session ID or tracker index (' + ans.trackers.length + ' : ' + (trackerIndex + 1) + ')';
            return;
        }

        // Extend the mouse coordinate of the tracker
        let mouseData = ans.trackers[trackerIndex].mouse;
        Array.prototype.push.apply(mouseData, data);
        ans.trackers[trackerIndex].mouse = mouseData;
        ans.markModified('trackers');

        try {
            yield ans.save();
            this.status = 204;
        } catch (error) {
            this.status = 500;
        }
    } else {
        yield this.regenerateSession();
        this.status = 400;
        this.body = 'Cannot find the session ID; make sure cookies are enabled';
    }
};
