'use strict';

let AdminController = require('../controllers/admin');

/**
 * Routing for admin module
 */
module.exports = function (router) {
    router.get('/admin', AdminController.render);
    router.get('/admin/login', AdminController.login);
    router.post('/admin/auth', AdminController.authenticate);
};
