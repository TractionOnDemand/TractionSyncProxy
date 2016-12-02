var google_security = require('google/google_security');
var google_sync = require('google/google_sync');
//var google_scheduler = require('google/google_scheduler');
var sf_handler = require('salesforce/salesforce_handler');
var sf_update = require('salesforce/salesforce_update');
var sf_oauth = require('salesforce/salesforce_oauth');
var pg_utils = require('pg/pg_utils');
var con = require('const/const');

// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;


// flow control steps
const STEP_SYNC_START = 1;
const STEP_SET_PENDING = 2
const STEP_GET_AUTH_TOKENS = 3;
const STEP_REFRESH_GOOGLE_TOKENS = 4;
const STEP_REFRESH_SF_TOKENS = 5;
const STEP_GET_DOC_METADATA_SHEET = 6;
const STEP_GET_SYNC_EDIT_ROW = 7;
const STEP_UPDATE_SF_ROW = 8;
const STEP_CLEAR_PENDING = 9;


const STEP_DONE = 99;


/**
 * Main callback handler for Google => SalesForce data sync.
 * This will manage the flow control for the sync process.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-04
 */
function sync_callback_handler(err, req, res) {

    if (LOG_TRACE) console.log('sync_callback_handler: ENTER');

    // Catch all the bad things that happen.
    if (err) {
        if (LOG_ERROR) console.log('Error processing sync request. ' + err);
        req.sf_sync.status = con.SYNC_STATUS_ERROR;
        req.sf_sync.status_msg = err;
        try {
            return google_sync.set_row_status(req, res);
        } catch (exception){
            return;
        }
    }

    // Step #: Initialize the Sync request
    if (STEP_SYNC_START == req.sf_sync.next_step) {

        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - GOOGLE OAUTH');
        req.sf_sync.next_step = STEP_SET_PENDING;

        try {
            // placeholder to force google oauth.
            sync_callback_handler(null, req, res);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_SET_PENDING == req.sf_sync.next_step) {

        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - SYNC START');
        req.sf_sync.next_step = STEP_GET_AUTH_TOKENS;
        try {
            google_sync.handle_trigger(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

        // Step #: Initialize the Sync request
    } else if (STEP_GET_AUTH_TOKENS == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - GET AUTH TOKENS #:' + req.sf_sync.key);
        req.sf_sync.next_step = STEP_REFRESH_GOOGLE_TOKENS;
        try {
            pg_utils.get_tokens_by_document(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_REFRESH_GOOGLE_TOKENS == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - REFRESH GOOGLE TOKENS');
        req.sf_sync.next_step = STEP_REFRESH_SF_TOKENS;

        try {
            // refresh the google oauth access tokens.
            google_security.refresh_token(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_REFRESH_SF_TOKENS == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - REFRESH SF TOKENS');
		req.sf_sync.next_step = STEP_GET_DOC_METADATA_SHEET;

        try {
            // refresh the salesforce oauth access tokens.
            sf_oauth.refresh_token(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_GET_DOC_METADATA_SHEET == req.sf_sync.next_step) {

        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - GET DOC METADATA SHEET #:' + req.sf_sync.key);
        req.sf_sync.next_step = STEP_GET_SYNC_EDIT_ROW;

        // save the new google token if it exists. don't wait for a callback.
        try {
            if (req.sf_sync.google_oauth) {
                pg_utils.update_google_user_security(req, res, function(){});
            }
            google_sync.get_metadata(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_GET_SYNC_EDIT_ROW == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - GET SYNC EDIT ROW #:' + req.sf_sync.key);
        req.sf_sync.next_step = STEP_UPDATE_SF_ROW;
        try {
            google_sync.get_sync_edit_row(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_UPDATE_SF_ROW == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - UPDATE SALESFORCE #:' + req.sf_sync.key);
        req.sf_sync.next_step = STEP_CLEAR_PENDING;
        try {
            sf_update.update_sobject(req, res, sync_callback_handler);
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }

    } else if (STEP_CLEAR_PENDING == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- sync_callback_handler: Step ' + req.sf_sync.next_step + ' - CLEAR PENDING #:' + req.sf_sync.key);
        req.sf_sync.next_step = STEP_DONE;
        req.sf_sync.status = con.SYNC_STATUS_SUCCESS;
        req.sf_sync.status_msg = '';
        try {
            if (req.sfdc_batch != undefined) {
                google_sync.set_row_status_multiple_result(req, res);
            } else {
                google_sync.set_row_status(req, res);
            }
        } catch (exception) {
            return sync_callback_handler(exception, req, res);
        }
    }

    //if (LOG_TRACE) console.log('sync_callback_handler: EXIT');
}

/**
 * Callback handler for Google oauth authentication flow.
 * @author  Ricardo Visbal, Doug Jodrell, Traction on Demand
 * @date  2016-07-25
 */
function auth_callback(req, res) {
    if (LOG_TRACE) console.log('google_handler.auth_callback ENTER');
    if (!req.sf_sync) {
        req.sf_sync = {};
    }
    req.sf_sync.next_step = sf_handler.STEP_STORE_GOOGLE_OAUTH;
    google_security.auth_callback(req, res, sf_handler.export_callback_handler);
    if (LOG_TRACE) console.log('google_handler.auth_callback EXIT');
}

/**
 * Callback handler for Google sheet change trigger.
 * @author  Ricardo Visbal, Doug Jodrell, Traction on Demand
 * @date  2016-07-25
 */
function trigger_handler(req, res) {
    if (LOG_TRACE) console.log('trigger_handler ENTER');

    req.sf_sync = {};
    req.sf_sync.next_step = STEP_SYNC_START;
    sync_callback_handler(null, req, res);

    if (LOG_TRACE) console.log('trigger_handler EXIT');
}


exports.auth_callback = auth_callback;
exports.sync_callback_handler = sync_callback_handler;
exports.trigger_handler = trigger_handler;