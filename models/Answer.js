'use strict';
let mongoose = require('../config/database');

let AnswerSchema = new mongoose.Schema({
    consentId: String,
    trackers: []
});

let Answer = mongoose.model('Answer', AnswerSchema);
module.exports = Answer;
