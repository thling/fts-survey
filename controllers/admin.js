'use strict';

let render = require('koa-ejs');
let UserNotAuthorisedError = require('../lib/errors.js').UserNotAuthorisedError;
let Question = require('../models/Question');

/**
 * Redirects user if s/he has not logged in; otherwise, display dashboard.
 */
module.exports.render = function *() {
    let cookie = this.session.token;
    if (!cookie || cookie !== process.env.API_KEY) {
        this.redirect('/admin/login');
    } else {
        let questions = yield Question.find();

        yield this.render('admin/dash', {
            questions: questions,
            logo: 'Admin Dashboard'
        });
    }
}

/**
 * Checks if the user has logged in. If so, redirect to dashboard;
 * otherwise, renders login page
 */
module.exports.login = function *() {
    let cookie = this.session.token;
    if (cookie && cookie === process.env.API_KEY) {
        this.redirect('/admin');
    } else {
        yield this.render('admin/login', { logo: 'Admin Login' });
    }
}

/**
 * Authenticates user by using super bad auth technique.
 * Will do for this project.
 */
module.exports.authenticate = function *() {
    let data = this.request.body;

    if (!data.username || data.username !== process.env.ADMIN_UNAME
            || !data.password || data.password !== process.env.ADMIN_PW) {
        throw new UserNotAuthorisedError("Nope.");
    }

    this.session.token = process.env.API_KEY;
    this.body = {
        redirect: '/admin'
    };
}

/**
 * Creates new questions and save it into database.
 */
module.exports.createQuestion = function *() {
    let cookie = this.session.token;
    if (!cookie || cookie !== process.env.API_KEY) {
        throw new UserNotAuthorisedError("Unauthorised individual tries to access");
    } else {
        let data = this.request.body;
        if (!data.title || data.title === '' || data.title.length === 0) {
            this.status = 400;
            this.body = {
                message: 'Title cannot be empty.'
            };
        } else if (!data.description || data.description === ''
                || data.description.length === 0) {
            this.status = 400;
            this.body = {
                message: 'Description cannot be empty.'
            };
        } else if (data.answers && data.answers.length < 2) {
            this.status = 400;
            this.body = {
                message: 'Multiple choice answers must have least 2 choices.'
            };
        } else {
            if (!data.answers) {
                data.answers = {};
            }

            let question = new Question(data);
            try {
                yield question.save();
                this.status = 200;
            } catch (err) {
                console.error(err.message);
                this.status = 500;
            }
        }
    }
}

/**
 * Deletes question from the database.
 */
module.exports.deleteQuestion = function *() {
    let cookie = this.session.token;
    if (!cookie || cookie !== process.env.API_KEY) {
        throw new UserNotAuthorisedError("Unauthorised individual tries to access");
    } else {
        let data = this.request.body;
        if (!data.id) {
            this.status = 400;
            this.body = {
                message: 'ID not provided'
            }
        } else {
            try {
                yield Question.findOneAndRemove({ _id: data.id });
                this.status = 200;
            } catch (err) {
                console.error(err.message);
                this.status = 500;
            }
        }
    }
}
