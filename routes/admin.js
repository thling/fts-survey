'use strict';

let AdminController = require('../controllers/admin');

module.exports = function (router) {
    router.get('/admin', AdminController.render);
    router.post('/admin/login', AdminController.authenticate);
};
