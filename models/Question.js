'use strict';
let mongoose = require('../config/database');

let QuestionSchema = new mongoose.Schema({
    title: String,
    description: String,
    answers: {},
});

let Question = mongoose.model('Question', QuestionSchema);
module.exports = Question;
