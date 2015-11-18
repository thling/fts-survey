'use strict';

let render = require('koa-ejs');

module.exports.render = function *() {
    yield this.render('survey/frame');
}

module.exports.getNext = function *() {
    yield this.render('survey/consent-form', { data: 'yoyoyoo' });
}
