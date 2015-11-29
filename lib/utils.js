'use strict';

let _ = require('lodash');

/**
 * Parses a uri and returns its components. Unlike Node.js's built-in
 * url.parse function, this method will intelligently detect different
 * types of URI composition. Please refer to tests/lib/utils.js
 * for the tested and accepted forms of input.
 *
 * @param   origUri     An uri string
 * @return  An object of all the uri components of the following form:
 *      {
 *          uri: The parameter passed in, untouched (e.g. ssh://un:pw@t.co:1888/foo/bar?hi=30)
 *          protocol: undefined or the parts before :// (e.g. ssh)
 *          username: undefined or the username (e.g. un)
 *          password: undefined or the password (e.g. pw)
 *          host: undefined or the host + port part (e.g. t.co:1888)
 *          hostname: undefined or the host part (e.g. t.co)
 *          port: undefined or the port part in integer (e.g. 1888)
 *          path: undefined or the rest of the url (e.g. /foo/bar?hi=30)
 *      }
 */
let parseURI = function (origUri) {
    let uri = decodeURI(origUri);
    let host, hostname, password, path, port, protocol, username;
    let lastSlice = 0;

    // Determine the protocol
    let curSlice = uri.indexOf('://', lastSlice);
    if (curSlice >= 0) {
        protocol = uri.slice(lastSlice, curSlice);
        lastSlice = curSlice + 3;
    }

    // Determine the authentication part if existed
    curSlice = uri.indexOf('@', lastSlice);
    if (curSlice >= 0) {
        let authParts = uri.slice(lastSlice, curSlice).split(':');
        username = authParts[0];
        password = authParts[1];
        lastSlice = curSlice + 1;
    }

    // Determine the host and path parts
    curSlice = uri.indexOf('/', lastSlice);
    if (curSlice >= 0) {
        let hostSlice = uri.slice(lastSlice, curSlice);
        if (hostSlice.indexOf('.') > 0 || hostSlice.startsWith('localhost')) {
            // There is valid host part if there is something
            // between '://' and next first '/', or if it is
            // 'localhost' or contains a '.' before the first '/'
            host = hostSlice;
            lastSlice = curSlice;

            let hostParts = host.split(':');
            hostname = hostParts[0];
            port = hostParts[1];
        }

        // Parse the path part
        let pathSlice = uri.slice(lastSlice);
        if (pathSlice && pathSlice !== '') {
            path = pathSlice;
        }
    } else if (uri !== '') {
        // Check if there is a query string if there is no '/'
        // after '://'
        curSlice = uri.indexOf('?', lastSlice);

        if (curSlice >= 0) {
            // There is a query string in the path
            host = uri.slice(lastSlice, curSlice);
            path = uri.slice(curSlice);
        } else {
            // No path nor query string
            host = uri.slice(lastSlice);
        }

        let hostParts = host.split(':');
        hostname = hostParts[0];
        port = hostParts[1];
    }

    return {
        uri: uri,
        protocol: protocol,
        username: username,
        password: password,
        host: host,
        hostname: hostname,
        port: (port) ? parseInt(port) : port,
        path: path
    };
};

/**
 * Verifies obj against schema - return true if all
 * keys (including nested keys) exist in schema and nothing
 * is missing.
 *
 * @param   obj     The object to verify
 * @param   schema  Schema to verify against
 * @return  True if valid; false otherwise
 */
let verifySchema = function (obj, schema) {
    // Keep track of keys that have been checked
    let verified = { };

    for (let key in obj) {
        if (!_.has(schema, key)) {
            return false;
        }

        let nested = true;
        if (_.isPlainObject(obj[key])) {
            // Recursively check if there are nested objects
            nested = verifySchema(obj[key], schema[key]);
        }

        if (nested) {
            verified[key] = true;
        } else {
            return false;
        }
    }

    for (let key in schema) {
        if (verified[key]) {
            continue;
        }

        // If it gets here, it means there
        // is something in schema that is not in obj
        return false;
    }

    return true;
}

module.exports.parseURI = parseURI;
module.exports.verifySchema = verifySchema;
