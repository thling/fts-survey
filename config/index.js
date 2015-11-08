'use strict';

module.exports = {
    port: process.env.PORT || 3000,
    dbconn: process.env.MONGOLAB_URI || 'mongodb://localhost:27017/fts-survey'
};
