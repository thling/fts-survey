'use strict';

let config = require('.');
let mongoose = require('mongoose');
let utils = require('../lib/utils');
let mg;

module.exports = (function () {
    if (!mg) {
        mg = mongoose.connect(config.db);
    }

    return mg;
})();
