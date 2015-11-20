'use strict';
'use strict';

let SurveyController = require('../controllers/survey');

/**
 * Routing for admin module
 */
module.exports = function (router) {
    router.get('/', SurveyController.render);
    router.get('/page/:index', SurveyController.getPage);
    router.get('/next', SurveyController.getNext);
    router.get('/prev', SurveyController.getPrev);
};
