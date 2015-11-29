'use strict';
let mongoose = require('../config/database');
/**
 * Answer model contains consentId and trackers.
 * Each document in the collection represents a survey
 * session.
 *
 * consentId is used to record that the user
 * has agreed to the consent form
 *
 * trackers is an array used to record the tracking
 * event for a particular session.
 *
 * The objectID assigned by MongoDB is used as
 * sessionId for the client
 */
let AnswerSchema = new mongoose.Schema({
    consentId: String,
    trackers: []
});

let Answer = mongoose.model('Answer', AnswerSchema);
module.exports = Answer;
