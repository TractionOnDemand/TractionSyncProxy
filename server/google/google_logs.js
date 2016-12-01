/**
 * google_logs.js
 * @description : Handle Google Document logs
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
// native modules
var express = require('express');
var googleApis = require('googleapis');
var googleAuth = require('google-auth-library');
var google_utils = require('google/google_utils');
var google_sheet_utils = require('google/google_sheet_utils');

// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;


function buildRow(id, type, msg) {
    var row = {
        Id: id,
        Type: type,
        Date: new Date(),
        Message: msg
    };
    return row;
}

function createLogSheet(req) {
    var token = req.sf_sync.google_access_token;
    // insert a new worksheet at index 0
    google_sheet_utils.insert_sheet(req.sf_sync.doc_id, null, token, 2, function(err, worksheet) {
        if (err) {
            if (LOG_ERROR) console.log('createLogSheet - error: ' + err);
        }

        if (LOG_DEBUG_VERBOSE) console.log(worksheet);

        // get all the sheets
        google_sheet_utils.get_sheets(req.sf_sync.doc_id, token, function(err, spreadsheet) {

            if (err) {
                if (LOG_ERROR) console.log('createLogSheet - get_sheets error: ' + err);
            }

            req.sf_sync.sheets["log_id"] = spreadsheet.sheets[2].properties.sheetId;
            //"Id", "Type", "Date", "Message"
            var header_rows = Array();
            var r = { values: [] };
            r.values.push({ userEnteredValue: { "stringValue": "Id" } });
            r.values.push({ userEnteredValue: { "stringValue": "Type" } });
            r.values.push({ userEnteredValue: { "stringValue": "Date" } });
            r.values.push({ userEnteredValue: { "stringValue": "Message" } });
            header_rows.push(r);
            google_sheet_utils.add_sheet_header(req.sf_sync.doc_id, req.sf_sync.sheets.log_id, token, "LOG", header_rows, 200, function(err, worksheet) {

            });
        });
    });
}


/*
function addLogToSheet(log_sheet, row) {
    try {
        log_sheet.addRow(row, function(err, resultData) {
            if (err) {
                //HTTP error 400 (Bad Request) - Blank rows cannot be written; use delete instead.
                if (LOG_DEBUG) console.log('addLogToSheet: addRow error: ' + err);
                // return callback(err, req, res);
            }
            if (LOG_DEBUG) console.log('addLogToSheet: added row: ' + resultData);
        });
    } catch (err) {
        if (LOG_DEBUG) console.log('addLogToDocument ERROR: ', err);
    }
}
*/

exports.buildRow = buildRow;
exports.createLogSheet = createLogSheet;
//exports.addLogToSheet = addLogToSheet;