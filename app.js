'use strict';
let _ = require('lodash');
let koa = require('koa');
let co = require('co');
let serve = require('koa-static');
let config = require('./config');
let app;

module.exports = (function () {
    if (!app) {
        app = koa();
        app.use(serve('./public'));

        app.listen(config.port);
        console.log('Listening on port', config.port);
    }

    return app;
})();
