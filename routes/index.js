'use strict';

let router = require('koa-router')();

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

module.exports = router;
