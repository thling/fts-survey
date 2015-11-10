'use strict';

let UserNotAuthorisedError = function (message) {
    this._name = 'UserNotAuthorisedError';
    this._message = message || 'User is not authorised to perform this action';
    this._statusCode = 403;
};

UserNotAuthorisedError.prototype = {
    get type() {
        return this._name;
    },
    get message() {
        return this._message;
    },
    generateContext: function (ctx) {
        ctx.unauthorized = true;
        ctx.status = this._statusCode;
        ctx.body = {
            message: this._message
        };
    },
    toString: function () {
        return '[' + this._name + '] '
            + this._statusCode + ': '
            + this._message;
    }
};

module.exports.UserNotAuthorisedError = UserNotAuthorisedError;
