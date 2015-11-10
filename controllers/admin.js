'use strict';

let UserNotAuthorisedError = require('../lib/errors.js').UserNotAuthorisedError;
let render = require('koa-ejs');

module.exports.render = function *() {
    if (!this.header.apikey || this.header.apikey !== process.env.API_KEY) {
        // this.body = "Please login!";
        yield this.render('admin/login', {
            name: 'test ejs'
        });
    } else {
        this.body = "Your are logged in :P";

    }
}

module.exports.authenticate = function *() {
    let data = this.request.body;
    if (!data.user || data.user !== process.env.ADMIN_UNAME
            || !data.password || data.password !== process.env.ADMIN_PW) {
        throw new UserNotAuthorisedError("Nope.");
    }

    this.body = {
        apikey: process.env.API_KEY
    };
}
