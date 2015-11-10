'use strict';

module.exports = {
    port: process.env.PORT || 3000,
    db: process.env.MONGOLAB_URI || 'mongodb://localhost:27017/fts-survey',
    appkey: process.env.APP_KEY || 'randomkey'
};
