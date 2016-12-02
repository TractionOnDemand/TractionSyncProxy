
var rest = require('restler');
var request = require('request');
var qs = require('qs');


// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;

// TODO: move these into database
var SF_REDIRECT_URI = process.env.SF_REDIRECT_URI;
var SF_LOGIN_URL = process.env.SF_LOGIN_URL;
var SF_KEY = process.env.SF_KEY;
var SF_SECRET = process.env.SF_SECRET;


/**
 *
 */
this.get_sf_token = function(req, res, callback) {
    if (LOG_TRACE) console.log('get_sf_token ENTER');

    // First time in. Send a request to SF to get the authorization code.
    if (! req.query.code) {
        if (LOG_TRACE) console.log('get_sf_token: START - redirecting to sf login.');
        var state = {
            req_id: req.sf_sync.sf_req_id
        }
        var oath_endpoint = SF_LOGIN_URL +'/authorize'+
            '?response_type=code' +
            '&client_id=' + SF_KEY +
            '&redirect_uri=' + SF_REDIRECT_URI +
            '&state='+ JSON.stringify(state);

        // go to the salesforce oauth page.
        res.redirect(oath_endpoint);
        // This session is over... we will continue from the new oauth callback request.
        res.end();

    // Got the callback from SF with the authorization code, now request the token.
    } else {
        if (LOG_DEBUG) console.log('get_sf_token - code: ['+req.query.code +'] state: ['+req.query.state+']');
        var state = JSON.parse(req.query.state);
        req.sf_sync.sf_req_id = state.req_id;
        // send a request to SF for the session token
        rest.post(SF_LOGIN_URL+'/token', {
            data: {
                grant_type: 'authorization_code',
                client_id: SF_KEY,
                client_secret: SF_SECRET,
                redirect_uri: SF_REDIRECT_URI,
                code: req.query.code
            },

        // got the token
        }).on('complete', function(data, response) {
            state = JSON.parse(req.query.state);
            if (LOG_TRACE) console.log('get_sf_token: COMPLETE')
            if (LOG_DEBUG_VERBOSE) {
                console.log('oath response: '+response.statusCode);
                console.log('access token: '+data.access_token);
                console.log('refresh token: '+data.refresh_token);
                console.log('user id: '+data.id);
                console.log('issued at: '+data.issued_at);
                console.log('instance url: '+data.instance_url);
                console.log('query state: '+req.query.state);
            }
            // store the token and callback to the handler.
            req.sf_sync.sf_oauth = data;
            req.sf_sync.sf_req_id = state.req_id;
            return callback(null, req, res);

        // bad things happened.
        }).on('error', function(err) {
            if (LOG_ERROR) console.error('get_sf_token error: '+err);
            return callback(err, req, res);
        });

    }

    if (LOG_TRACE) console.log('get_sf_token EXIT');
}

/**
 * Refresh the user's SalesForce OAuth token.
 */
this.refresh_token = function(req, res, callback) {
    if (LOG_TRACE) console.log('salesforce - refresh_token ENTER');

    rest.post(SF_LOGIN_URL+'/token', {
        data: {
            grant_type: 'refresh_token',
            client_id: SF_KEY,
            client_secret: SF_SECRET,
            refresh_token: req.sf_sync.sf_refresh_token
        }
    }).on('complete', function(data, response) {
        //if (LOG_DEBUG_VERBOSE) console.log('refresh_token response: '+response);
        // TODO: trap > 299 response codes and return appropriate error.

        if (LOG_DEBUG_VERBOSE) console.log('refresh_token data: '+JSON.stringify(data));
        if (LOG_DEBUG_VERBOSE) console.log('refresh_token - old: '+req.sf_sync.sf_access_token);
        req.sf_sync.sf_access_token = data.access_token;
        if (LOG_DEBUG_VERBOSE) console.log('refresh_token - new: '+req.sf_sync.sf_access_token);
        return callback(null, req, res);

    }).on('error', function(err) {
        if (LOG_ERROR) console.log('refresh_token - api_request error: '+err);
        return callback(err, req, res);
    });


/*
    request({
        url : SF_LOGIN_URL+'/token',
        method : 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body : {data: new Buffer(data, 'utf8')}
    }, function(err, result, body) {

        if (err) {
            if (LOG_ERROR) console.log('refresh_token - api_request error: '+err);
        } else {
            if (LOG_DEBUG_VERBOSE) console.log('refresh_token response: '+result);
            if (LOG_DEBUG_VERBOSE) console.log('refresh_token response body: '+body);
        }

        try {
            body = JSON.parse(body);
            if (result.statusCode > 299) {
                err = new Error(body.error_description);
            } else {
                req.sf_sync.sf_access_token = body.access_token;
            }

        } catch (exception) {
            if (LOG_ERROR) console.log('refresh_token - cannot parse body: '+exception);
            err = exception;
        }
        return callback(err, req, res);
    });
*/
}

