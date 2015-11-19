'use strict';

let crypto = require('crypto');
let render = require('koa-ejs');

// Sequence of our pages
const SEQ = [
    'start',    // welcome page is part of start already so not listed here
    'welcome',
    'consent-form'
];

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
    return crypto.createHash('sha256').update(ip || "").digest('hex');;
};

/**
 * Renders and returns first page's contents.
 *
 * Sets the progress cookie to indicate the page being displayed.
 */
module.exports.render = function *() {
    this.session.progress = 0;
    yield this.render('survey/' + SEQ[0]);
};

/**
 * Renders and returns next page's contents.
 *
 * Uses the cookie value 'progress' to determine which
 * page to render.
 */
module.exports.getNext = function *() {
    let consentIndex = SEQ.indexOf('consent-form');
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
    } else if (prog === consentIndex) {
        // Sets the consent cookie
        this.session.consentId = getIpHash(this.request.ip);
        this.session.progress = nextProg;
        this.body = {
            ok: true,
            // Note: use option { writeResp: false } to tell
            // renderer to return the html, not set it in body
            contents: yield this.render('survey/' + SEQ[nextProg], { writeResp: false })
        };
    } else if (nextProg > consentIndex && (!this.session.consentId ||
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
            contents: yield this.render('survey/' + SEQ[nextProg], { writeResp: false })
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
                contents: yield this.render('survey/' + SEQ[prevProg], { writeResp: false })
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
