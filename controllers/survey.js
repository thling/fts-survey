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

let isReasonableTime = function (epoch) {
    let cur = Date.now();
    epoch = parseInt(epoch);
    return (epoch < cur && epoch > cur - 5400000);
}


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
                requiresConsent: (index === CONSENT_INDEX) ? true: false
            };
        } else {
            // If everything is good then render
            this.session.progress = index;
            this.body = {
                ok: true,
                contents: yield this.render('survey/' + SEQ[index].template, { writeResp: false }),
                requiresConsent: (index === CONSENT_INDEX) ? true: false
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
            requiresConsent: (nextProg === CONSENT_INDEX) ? true: false
        };
    } else if (nextProg > CONSENT_INDEX && (!this.session.consentId ||
            this.session.consentId !== getIpHash(this.request.ip))) {
        // If consentId is not set and prog is already past consent form,
        // some bad thing has happened. Redirect to first page
        yield this.regenerateSession();
        this.status = 400;
    } else {
        // Valid prog and has proper authorisation
        this.session.progress = nextProg;
        this.body = {
            ok: true,
            contents: yield this.render('survey/' + SEQ[nextProg].template, { writeResp: false }),
            requiresConsent: (nextProg === CONSENT_INDEX) ? true: false
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
                requiresConsent: (prevProg === CONSENT_INDEX) ? true: false
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
        this.status = 200;
        this.body = {
            ok: false,
            message: 'Please give consent to the consent form before proceeding'
        };

        return;
    }

    // Verify we have everything good
    let data = JSON.parse(this.request.body.data);

    if (!(yield validateTracker(data))) {
        this.status = 200;
        this.body = {
            ok: false,
            message: 'The tracking schemas do not match'
        };

        return;
    }

    let id = this.session.sessionId;
    if (id) {
        let ans = yield Answer.findOne({ _id: id });
        if (!ans) {
            yield this.regenerateSession();
            this.status = 200;
            this.body = {
                ok: false,
                message: 'Cannot find the session ID; make sure cookies are enable'
            };

            return;
        }

        if (!ans.trackers) {
            ans.trackers = [];
        }

        ans.trackers.push(data);
        try {
            yield ans.save();
            this.status = 204;
        } catch (error) {
            console.error(error.message);
            this.status = 500;
        }
    } else {
        yield this.regenerateSession();
        this.status = 200;
        this.body = {
            ok: false,
            message: 'Cannot find the session ID; make sure cookies are enabled'
        };
    }
};

module.exports.pushCoords = function *() {
    if (this.session.consentId !== getIpHash(this.request.ip)) {
        yield this.regenerateSession();
        this.status = 200;
        this.body = {
            ok: false,
            message: 'Please give consent to the consent form before proceeding'
        };

        return;
    }

    let data = JSON.parse(this.request.body.coords);

    if (!data) {
        this.status = 400;
        this.body = {
            ok: false,
            message: 'Received no payloads'
        };

        return;
    }

    let id = this.session.sessionId;
    if (id) {
        let ans = yield Answer.findOne({ _id: id });
        if (!ans) {
            yield this.regenerateSession();
            this.status = 200;
            this.body = {
                ok: false,
                message: 'Cannot find the session ID; make sure cookies are enable'
            };

            return;
        }

        if (!ans.trackers) {
            ans.trackers = [];
        }

        console.log(_.omit(ans.trackers[ans.trackers.length - 1], 'mouse'));
        let mouseData = ans.trackers[ans.trackers.length - 1].mouse;
        console.log('Orig length: ' + mouseData.length);
        Array.prototype.push.apply(mouseData, data);
        console.log('New length: ' + mouseData.length);

        ans.trackers[ans.trackers.length - 1].mouse = mouseData;
        try {
            yield ans.save();
            console.log('Mouse length', ans.trackers[ans.trackers.length - 1].mouse.length);
            this.status = 204;
        } catch (error) {
            console.error(error.message);
            this.status = 500;
        }
    } else {
        yield this.regenerateSession();
        this.status = 400;
        this.body = {
            ok: false,
            message: 'Cannot find the session ID; make sure cookies are enabled'
        };
    }
};
