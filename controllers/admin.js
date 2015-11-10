'use strict';

let render = require('koa-ejs');
let crypto = require('crypto');
let UserNotAuthorisedError = require('../lib/errors.js').UserNotAuthorisedError;

/**
 * Redirects user if s/he has not logged in; otherwise, display dashboard.
 */
module.exports.render = function *() {
    let cookie = this.session.token;
    if (!cookie || cookie !== process.env.API_KEY) {
        this.redirect('/admin/login');
    } else {
        this.body = 'You are logged in!';
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
        yield this.render('admin/login');
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
