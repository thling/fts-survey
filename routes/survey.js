'use strict';
'use strict';

let SurveyController = require('../controllers/survey');

/**
 * Routing for admin module
 */
module.exports = function (router) {
    router.get('/', SurveyController.render);
    router.get('/next', SurveyController.getNext);
};
