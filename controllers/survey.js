'use strict';

let crypto = require('crypto');
let render = require('koa-ejs');
let Question = require('../models/Question');

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
    return crypto.createHash('sha256').update(ip || "secretkey").digest('hex');;
};

/**
 * Retrieves question list and caches them
 */
let questions;
let getQuestions = function *() {
    if (!questions) {
        questions = yield Question.find();
    }

    return questions;
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

        // Since next is 'questions', have to render it
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
