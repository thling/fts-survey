'use strict';

let _ = require('lodash');
let koa = require('koa');
let bodyParser = require('koa-bodyparser');
let serve = require('koa-static');
let render = require('koa-ejs');

let config = require('./config');
let router = require('./routes');

let app;

module.exports = (function () {
    if (!app) {
        app = koa();
        app.use(bodyParser());
        app.use(router.routes());
        app.use(serve('./public'));
        render(app, {
            root: './views',
            cache: false,
            layout: false,
            viewExt: 'ejs',
            debug: (process.env.NODE_ENV === 'production') ? false : true
        });

        app.listen(config.port);
        console.log('Listening on port', config.port);
    }

    return app;
})();
