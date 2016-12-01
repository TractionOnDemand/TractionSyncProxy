/**
 * @description Flow control handler for Salesforce export requests.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-07-26
 */

// native modules
var express = require('express');

// custom modules
var pg_utils = require('pg/pg_utils');
var sf_oauth = require('salesforce/salesforce_oauth');
var sf_utils = require('salesforce/salesforce_utils');
var sf_update = require('salesforce/salesforce_update');
var google_security = require('google/google_security');
var google_create = require('google/google_create');
var google_utils = require('google/google_utils');

// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;


// export flow control steps
const STEP_SETUP_SECURITY       = 1;
const STEP_SETUP_REQUEST        = 2;
const STEP_GET_ORG_KEYS         = 3;
const STEP_SF_OAUTH             = 4;
const STEP_STORE_SF_OAUTH       = 5;
const STEP_GOOGLE_OAUTH         = 6;
const STEP_STORE_GOOGLE_OAUTH   = 7;
const STEP_LANDING_PAGE         = 8;
const STEP_GET_AUTH_TOKENS      = 9;
const STEP_GET_META_DATA        = 10;
const STEP_GET_LIST_DATA        = 11;
const STEP_CREATE_SHEET         = 12;
const STEP_UPDATE_REQUEST       = 13;
const STEP_WRITE_SHEET_META     = 14;
const STEP_WRITE_SHEET_DATA     = 15;
const STEP_SETUP_LISTENER       = 16;
const STEP_OPEN_DOCUMENT        = 17;

// org setup flow control
const ORG_SETUP_DB = 1;
const ORG_SETUP_DONE = 99;

/**
 * Main handler function for SalesForce ==> Google data export.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-07-26
 */
this.export_list = function(req, res) {

    if (LOG_TRACE) console.log('export_list: ENTER');

    // setup the flow control variable
    req.sf_sync = {};
    req.sf_sync.next_step = STEP_SETUP_SECURITY;

    // start the callback loop
    export_callback_handler(null, req, res);
    if (LOG_TRACE) console.log('export_list: EXIT');
}

/**
 * Wrapper to handle the SalesForce oauth callback request.
 */
function sf_oauth_callback (req, res) {
    if (LOG_TRACE) console.log('sf_oauth_callback ENTER');
    // This is the callback request from SalesForce.
    if (!req.sf_sync) {
        // initialize the export object and set the next step.
        req.sf_sync = {};
        req.sf_sync.next_step = STEP_STORE_SF_OAUTH;
    }
    // handle the oauth exchange.
    sf_oauth.get_sf_token(req, res, export_callback_handler);
    if (LOG_TRACE) console.log('sf_oauth_callback EXIT');
}

this.org_setup = function(req, res) {
    if (LOG_TRACE) console.log('org_setup ENTER');

    req.sf_sync = {};
    req.sf_sync.next_step = ORG_SETUP_DB;
    org_callback_handler(null, req, res);
}

/**
 * I don't think this is used anymore...?
 */
function org_callback_handler(err, req, res) {

    if (err) {
        if (LOG_ERROR) console.log('org_setup_callback ERROR: '+err);
        res.send(err);
        return;
    }

    if (ORG_SETUP_DB == req.sf_sync.next_step) {
        if (LOG_TRACE) console.log('---------------- org_callback_handler: Step 1 - SETUP DATABASE');
        req.sf_sync.next_step = ORG_SETUP_DONE;
        pg_utils.add_sf_org(req, res, org_callback_handler);

    } else {
        if (LOG_TRACE) console.log('---------------- org_callback_handler: Step # - DONE');
        res.send('Org setup complete.');
    }

}

/**
 * Handler for request to get the URL of an existing Google Sheet.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-11
 */
this.get_sheet = function(req, res) {
    if (LOG_TRACE) console.log('get_sheet ENTER');
    if (LOG_DEBUG) console.log('get_sheet user_id: '+req.query.user_id +' list_id: '+req.query.list_id);

    req.sf_sync = {};
    req.sf_sync.sf_user_id = req.query.user_id;
    req.sf_sync.sf_list_id = req.query.list_id;

    pg_utils.get_sheet_id(req, res, function(err, sheet_id) {
        if (LOG_DEBUG) console.log('get_sheet response: '+sheet_id);
        if (err) {
            if (LOG_ERROR) console.log('get_sheet error: '+err);
            return res.send(null);
        }
        if (sheet_id) {
            req.sf_sync.sheet_url = google_utils.getDocUrl(sheet_id);
            //req.sf_sync.sheet_url = google_utils.getMacroUrl(sheet_id);
            if (LOG_DEBUG) console.log('get_sheet url: '+req.sf_sync.sheet_url);
        }
        res.send(req.sf_sync.sheet_url);
    });

}


this.page_handler = function(req, res) {
    if (LOG_TRACE) console.log('page_handler ENTER');

    if (req.body.requestId != undefined) {
        req.sf_sync = {};
        req.sf_sync["sf_req_id"] = req.body.requestId;
        req.sf_sync["next_step"] = req.body.nextStep;
        req.sf_sync["pending_step"] = req.body.nextStep;

    } else if (req.body.sf_sync != undefined) {
        req.sf_sync = req.body.sf_sync;
    }
    export_callback_handler(null, req, res);
    //req.sf_sync = {};
    //req.sf_sync.next_step = ORG_SETUP_DB;

}

this.rows = function(req, res) {
    if (LOG_TRACE) console.log('rows ENTER');

    google_create.add_rows_sheet(req, res);
}

/**
 * Update a SFDC sobject.
 */
this.update_salesforce = function(req, res) {
    sf_update.update_sobject(req, res);
}

/**
 * Callback handler for SalesForce ==> Google data export.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-07-26
 */
function export_callback_handler(err, req, res) {
    if (LOG_TRACE) console.log('export_callback_handler: ENTER');

    // Catch all the bad things that happen.
    if (err) {
        if (LOG_ERROR) console.trace('!!! Error processing export request: ' + err);
        //res.send('Error processing export request. ' +err);
        res.json(req.sf_sync.page_message = err.message);

        //return;
    } else {
        // Store the user security.
        if (STEP_SETUP_SECURITY == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - SETUP SECURITY');
            req.sf_sync.next_step = STEP_SETUP_REQUEST;
            pg_utils.add_user_security(req, res, export_callback_handler);


        // Store the user request.
        } else if (STEP_SETUP_REQUEST == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - SETUP REQUEST');
            req.sf_sync.next_step = STEP_SF_OAUTH;
            pg_utils.add_user_request(req, res, export_callback_handler);


        // Authenticate with Salesforce
        } else if (STEP_SF_OAUTH == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - SF OAUTH');
            req.sf_sync.next_step = STEP_STORE_SF_OAUTH;
            sf_oauth_callback(req, res);


        // Store the Salesforce oauth data.
        } else if (STEP_STORE_SF_OAUTH == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - STORE SF OAUTH');
            req.sf_sync.next_step = STEP_GOOGLE_OAUTH;
            pg_utils.update_sf_user_security(req, res, export_callback_handler);


        // Authenticate with Google.
        } else if (STEP_GOOGLE_OAUTH == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - GOOGLE OAUTH');
            req.sf_sync.next_step = STEP_STORE_GOOGLE_OAUTH;
            var authUrl = google_security.getAuthUrl(req.sf_sync.sf_req_id);
            res.redirect(authUrl);


        // Store the Google oauth data.
        } else if (STEP_STORE_GOOGLE_OAUTH == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - STORE GOOGLE OAUTH');
            req.sf_sync.next_step = STEP_LANDING_PAGE;
            pg_utils.update_google_user_security(req, res, export_callback_handler);


        // Setup the Landing Page
        } else if (STEP_LANDING_PAGE == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - STEP LANDING PAGE');
            res.render('salesforce', { requestId: req.sf_sync.sf_req_id, nextStep: STEP_GET_AUTH_TOKENS, message: "loading..." });


        // Retrieve the auth tokens from the DB.
        } else if (STEP_GET_AUTH_TOKENS == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - GET AUTH TOKENS');
            if (STEP_GET_AUTH_TOKENS == req.sf_sync.pending_step) {
                req.sf_sync.pending_step = STEP_GET_META_DATA;
                pg_utils.get_tokens_by_request(req, res, export_callback_handler);
            } else {
                req.sf_sync.page_message = "Getting Salesforce list view metadata";
                req.sf_sync.next_step = STEP_GET_META_DATA;
                res.json(req.sf_sync);
            }


        // Get the List/Report data
        } else if (STEP_GET_META_DATA == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - GET LIST META');
            try {
                if (STEP_GET_META_DATA == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_GET_LIST_DATA;
                    sf_utils.get_list_meta(req, res, export_callback_handler);
                } else {
                    req.sf_sync.page_message = "Getting Salesforce list view data.";
                    req.sf_sync.next_step = STEP_GET_LIST_DATA; //STEP_GET_LIST_DATA;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Get the List/Report data
        } else if (STEP_GET_LIST_DATA == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - GET LIST DATA');
            try {
                if (STEP_GET_LIST_DATA == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_CREATE_SHEET;
                    sf_utils.get_list_data(req, res, export_callback_handler);
                } else {
                    req.sf_sync.page_message = "Creating Google sheet document with name: " + req.sf_sync.list_data.label;
                    req.sf_sync.next_step = STEP_CREATE_SHEET;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Get the List/Report data
        } else if (STEP_CREATE_SHEET == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - CREATE SHEET');
            try {
                if (STEP_CREATE_SHEET == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_UPDATE_REQUEST;
                    google_create.init_spreadsheet(req, res, export_callback_handler);
                } else {
                    req.sf_sync.page_message = "Saving document state.";
                    req.sf_sync.next_step = STEP_UPDATE_REQUEST;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Update the user request table with the document ID
        } else if (STEP_UPDATE_REQUEST == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - UPDATE REQUEST');
            try {
                if (STEP_UPDATE_REQUEST == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_WRITE_SHEET_META;
                    pg_utils.update_request_doc_id(req, res, export_callback_handler);
                } else {
                    req.sf_sync.page_message = "Creating metadata sheet.";
                    req.sf_sync.next_step = STEP_WRITE_SHEET_META;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Write the meta/picklist values
        } else if (STEP_WRITE_SHEET_META == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - WRITE SHEET META');
            try {
                if (STEP_WRITE_SHEET_META == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_WRITE_SHEET_DATA;
                    google_create.add_sheet_meta(req, res, export_callback_handler);
                } else {
                    var nof_rows = (req.sf_sync.list_data.rows) ? req.sf_sync.list_data.rows.length : 0;
                    req.sf_sync.page_message = "Adding " + nof_rows + " row(s) in google sheet ";
                    req.sf_sync.next_step = STEP_WRITE_SHEET_DATA;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Get the List/Report data
        } else if (STEP_WRITE_SHEET_DATA == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - WRITE SHEET DATA');
            try {
                if (STEP_WRITE_SHEET_DATA == req.sf_sync.pending_step) {
                    req.sf_sync.pending_step = STEP_SETUP_LISTENER;
                    google_create.fill_sheet(req, res, export_callback_handler);
                } else {
                    req.sf_sync.page_message = "Preparing google sheet configuration.";
                    req.sf_sync.next_step = STEP_SETUP_LISTENER;
                    res.json(req.sf_sync);
                }
            } catch (exception) {
                export_callback_handler(exception, req, res);
            }


        // Step #: Get the List/Report data
        } else if (STEP_SETUP_LISTENER == req.sf_sync.next_step) {
            if (LOG_TRACE) console.log('---------------- export_callback_handler: Step ' + req.sf_sync.next_step + ' - FINALIZE SHEET');
            if (STEP_SETUP_LISTENER == req.sf_sync.pending_step) {
                req.sf_sync.pending_step = STEP_OPEN_DOCUMENT;
                google_create.align_column_width(req, res, export_callback_handler);
            } else {
                req.sf_sync.page_message = "Opening Google sheet document.";
                req.sf_sync.next_step = STEP_OPEN_DOCUMENT;
                res.json(req.sf_sync);
            }
        } else {
            export_callback_handler('Invalid Step: ' + req.sf_sync.next_step, req, res);
        }
    }


    if (LOG_TRACE) console.log('export_callback_handler: EXIT');
}


exports.STEP_STORE_GOOGLE_OAUTH = STEP_STORE_GOOGLE_OAUTH;
exports.org_callback_handler = org_callback_handler;
exports.sf_oauth_callback = sf_oauth_callback;
exports.export_callback_handler = export_callback_handler;
