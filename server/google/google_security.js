/**
 * google_security.js
 * @description : Handle Google oauth to Google API
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */

var express = require('express');
var googleAuth = require('google-auth-library');

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL,
    SCOPE = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/script.scriptapp"]


var gAuth = new googleAuth();
var oauth2Client = new gAuth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);

// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;

this.getAuthUrl = function(requestId) {
    if (LOG_DEBUG) console.log('getAuthUrl: state= '+requestId);
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPE,
        state: requestId
    });
}

this.auth_callback = function(req, res, callback) {
    if (LOG_TRACE) console.log('google_security.auth_callback ENTER');
    if (LOG_DEBUG) console.log('code: '+req.query.code);

    oauth2Client.getToken(req.query.code, function(err, tokens) {
        if (err) {
            if (LOG_ERROR) console.log(err);
            return callback(err, req, res);
        } else {
            oauth2Client.setCredentials(tokens);
            if (req.query.state) {
                if (LOG_DEBUG) console.log('google_security.auth_callback request ID: '+req.query.state);

                req.sf_sync.sf_req_id = req.query.state;
                req.sf_sync.google_oauth = tokens;

                if (LOG_DEBUG_VERBOSE) console.log('auth_callback - tokens: '+JSON.stringify(tokens));
                return callback(null, req, res);

            } else {
                return callback('Invalid request key', req, res);
            }
        }

        //res.render('googlecode', { code: req.query.code, access_token: token.access_token, refresh_token: token.refresh_token, type: 'TOKEN' });
    });
    if (LOG_TRACE) console.log('google_security.auth_callback EXIT');

}

/**
 * @description Refresh a google access token
 * @author Doug Jodrell, Traction on Demand
 * @date Aug 23, 2016
 */
this.refresh_token = function(req, res, callback) {
    if (! req.sf_sync.google_refresh_token) {
        return callback('no refresh token', req, res);
    }

    var timestamp = (new Date()).getTime();
    if (LOG_DEBUG_VERBOSE) {
        console.log('refresh_token - expiry date: ' + req.sf_sync.google_token_expire_date);
        console.log('refresh_token - current time: ' + timestamp);
    }

    // if the access token is expired.
    if (timestamp > req.sf_sync.google_token_expire_date) {
        if (LOG_DEBUG) console.log(' --- THIS TOKEN IS EXPIRED --- ');
        oauth2Client.credentials.refresh_token = req.sf_sync.google_refresh_token;
        oauth2Client.credentials.access_token = req.sf_sync.google_access_token;
        oauth2Client.credentials.expiry_date = req.sf_sync.google_token_expire_date;

        oauth2Client.refreshAccessToken(function(err, tokens, response) {
            if (err) {
                if (LOG_ERROR) console.log('refresh_token: '+err);
                return callback(err, req, res);
            }

            if (LOG_DEBUG_VERBOSE) {
                console.log('refreshAccessToken response: '+JSON.stringify(response));
                console.log('new tokens: '+JSON.stringify(tokens));
                console.log('refresh_token old: '+req.sf_sync.google_access_token);
                console.log('refresh_token new: '+tokens.access_token);
                console.log('refresh_token date: '+tokens.expiry_date);
            }

            req.sf_sync.google_access_token = tokens.access_token;
            req.sf_sync.google_token_expire_date = tokens.expiry_date;

            // hack the token into the google_oauth object so we can save it to the database.
            // TODO: standardize the way we handle this oauth object.
            req.sf_sync.google_oauth = tokens;

            return callback(null, req, res);
        });
    } else {
        return callback(null, req, res);
    }

}
