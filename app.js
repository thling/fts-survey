'use strict';

let koa = require('koa');
let bodyParser = require('koa-bodyparser');
let serve = require('koa-static');
let session = require('koa-generic-session');
let render = require('koa-ejs');

let config = require('./config');
let router = require('./routes');

let app;

module.exports = (function () {
    if (!app) {
        app = koa();
        app.keys = [ config.appkey ];

        app.use(bodyParser());
        app.use(session({ prefix: '_fts_survey_' }));
        app.use(router.routes());
        app.use(serve('./public'));

        // Set EJS view renderer
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
