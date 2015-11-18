'use strict';

let router = require('koa-router')();

// This middleware handles exception
router.use(function *(next) {
    try {
        yield next;
    } catch (error) {
        console.log(error.message);
        if (error.type === 'UserNotAuthorisedError') {
            error.generateContext(this);
        } else {
            this.status = 500;
        }
    }
});

require('./admin')(router);
require('./survey')(router);

module.exports = router;
