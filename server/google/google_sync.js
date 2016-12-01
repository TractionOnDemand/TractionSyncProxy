/**
 * google_sync.js
 * @description : Handle Google Document post notification on update
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
// native modules
var express = require('express');
var googleApis = require('googleapis');
var googleAuth = require('google-auth-library');
var google_logs = require('google/google_logs');
// custom modules
//var google_security = require('google/google_security');
var google_utils = require('google/google_utils');
var google_sheet_utils = require('google/google_sheet_utils');
var pg_utils = require('pg/pg_utils');
var con = require('const/const');



// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;


var requestCount = 0;
/**
 * Respond to the trigger/notification from google sheets regarding a pending update.
 */
function handle_trigger(req, res, callback) {
    requestCount++;
    if (LOG_TRACE) console.log('handle_trigger ENTER #:' + requestCount);
    // TODO: store sync request in database?

    // get the updated document ID and row, then reply to the trigger sender.

    req.sf_sync.key = requestCount;
    req.sf_sync.doc_id = req.query.docId;
    var rowNumbers = req.query.row.split(",");
    req.sf_sync.rows = rowNumbers;
    req.sf_sync.row_index = rowNumbers[0] - 1;
    res.status(200).send("OK");

    if (LOG_DEBUG) console.log('handle_trigger: doc_id=' + req.sf_sync.doc_id + ' row_index=' + req.sf_sync.row_index);

    callback(null, req, res);
}

/**
 * Get the metadata from the metadata google sheet .
 */
function get_metadata(req, res, callback) {
    if (LOG_TRACE) console.log("get_metadata ENTER");
    if (LOG_DEBUG) console.log('get_metadata doc_id: ' + req.sf_sync.doc_id);

    if (req.sf_sync.sheets == undefined || req.sf_sync.sheets.metadata_id == undefined) {
        google_sheet_utils.get_sheets(req.sf_sync.doc_id, req.sf_sync.google_access_token, function(err, spreadsheet) {

            // if there was an error opening the document, just create a new one.
            if (err) {
                if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
                callback(err, req, res);
            } else {
                req.sf_sync.sheets = {};
                req.sf_sync.sheets.data_id = spreadsheet.sheets[0].properties.sheetId;
                req.sf_sync.sheets.metadata_id = spreadsheet.sheets[1].properties.sheetId;
                req.sf_sync.sheets.log_id = spreadsheet.sheets[2].properties.sheetId;

                get_metadata_content(req, res, callback);
            }

        });
    } else {
        get_metadata_content(req, res, callback);
    }

}

function get_metadata_content(req, res, callback) {
    if (LOG_TRACE) console.log("get_metadata_content ENTER");

    google_sheet_utils.get_rows(req.sf_sync.doc_id, req.sf_sync.sheets.metadata_id, req.sf_sync.google_access_token, "METADATA!1:5", function(err, data) {

        if (err) {
            if (LOG_ERROR) console.log('get_metadata_content - get_rows error: ' + err);
            return callback(err, req, res);
        } else {

            var metadataList = new Array();

            if (data.values != undefined && data.values.length > 0) {
                for (var i = 0; i < data.values[0].length; i++) {
                    var row1_cell_value = data.values[0][i];
                    var m = {};
                    if (row1_cell_value != undefined &&
                        row1_cell_value != "") {
                        m["col"] = i;
                        m["google_col"] = row1_cell_value.toLowerCase().split("_").join("");
                        m["sfdc_api_name"] = getRowValue(data.values[1], i); //google_utils.getObjectValue(rows, 0, p);
                        m["sfdc_type"] = getRowValue(data.values[2], i); //google_utils.getObjectValue(rows, 1, p);
                        m["sfdc_label"] = getRowValue(data.values[3], i);
                        m["sfdc_updatable"] = getRowValue(data.values[4], i); //google_utils.getObjectValue(rows, 3, p);
                        //if (LOG_DEBUG) console.log(m);
                        metadataList.push(m);
                    } else {
                        if (LOG_DEBUG_VERBOSE) console.log("get_metadata p:" + p + " index " + p.indexOf(":"));
                        if (LOG_DEBUG_VERBOSE) console.log(typeof rows[0][p]);
                    }
                }
            }
            if (LOG_DEBUG) console.log("get_metadata_content metadataList.length :" + metadataList.length);
            req.sf_sync.sobject_metadata_list = metadataList;

            callback(null, req, res);
        }
    });

}


/**
 * Get the row from the google sheet that needs to be synchronized.
 */
function get_sync_edit_row(req, res, callback) {
    if (LOG_TRACE) console.log("get_sync_edit_row ENTER");

    if (req.sf_sync.sheets == undefined || req.sf_sync.sheets.data_id == undefined) {
        var token = sf_sync.google_access_token;
        if (LOG_DEBUG_VERBOSE) console.log("DEBUG_REQ  : " + req.sf_sync.key + " d.sf_sync.sobject_metadata_list undefined ");
        google_sheet_utils.get_sheets(req.sf_sync.doc_id, token, function(err, spreadsheet) {

            // if there was an error opening the document, just create a new one.
            if (err) {
                if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
                callback(err, req, res);
            } else {
                req.sf_sync.sheets = {};
                req.sf_sync.sheets.data_id = spreadsheet.sheets[0].properties.sheetId;
                req.sf_sync.sheets.metadata_id = spreadsheet.sheets[1].properties.sheetId;
                req.sf_sync.sheets.log_id = spreadsheet.sheets[2].properties.sheetId;

                get_sync_edit_row_content(req, res, callback);
            }

        });
    } else {
        get_sync_edit_row_content(req, res, callback);
    }
}


function get_sync_edit_rows_content(req, res, callback) {
    if (LOG_TRACE) console.log("get_sync_edit_row ENTER");

    var rangeList = [];
    for (var i = 0; i < req.sf_sync.rows.length; i++) {
        rangeList.push("ranges=DATA!" + req.sf_sync.rows[i] + ":" + req.sf_sync.rows[i]);
    }
    //&valueRenderOption=UNFORMATTED_VALUES?majorDimension=ROWS
    var qs = rangeList.join("&") + "&majorDimension=ROWS";
    google_sheet_utils.batchGet_rows(req.sf_sync.doc_id, req.sf_sync.sheets.data_id, req.sf_sync.google_access_token, qs, function(err, data) {

        if (err) {
            if (LOG_ERROR) console.log('get_sync_edit_rows_content error: '+err);
            return callback(err, req, res);
        } else {
            setSyncSatusColumn(req);
            var sync_status_col = req.sf_sync["sync_status_col"];
            if (sync_status_col != undefined && sync_status_col > 0) {
                req.sf_sync.google_rows = [];

                var requestList = [];

                for (var x = 0; x < data.valueRanges.length; x++) {
                    var valueRange = data.valueRanges[x];
                    var valueRangeResults = valueRange.values;

                    if (valueRangeResults != undefined && valueRangeResults.length > 0) {
                        if (valueRangeResults[0].length > sync_status_col) {
                            var currentRow = valueRangeResults[0];
                            if (LOG_DEBUG_VERBOSE) console.log("get_sync_edit_rows_content currentRow[sync_status_col]:" + currentRow[sync_status_col]);
                            if (currentRow[sync_status_col] == con.SYNC_STATUS_EDIT) {

                                req.sf_sync.google_rows.push(currentRow);

                                var data_rows = new Array();
                                var r = { values: [] };
                                r.values.push({ userEnteredValue: { "stringValue": con.SYNC_STATUS_PENDING } });
                                r.values.push({ userEnteredValue: { "stringValue": "" } });
                                r.values.push({ userEnteredValue: { "stringValue": "" } });
                                data_rows.push(r);

                                var data_request = {
                                    "updateCells": {
                                        "start": {
                                            "sheetId": req.sf_sync.sheets.data_id,
                                            "rowIndex": req.sf_sync.rows[x] - 1,
                                            "columnIndex": sync_status_col
                                        },
                                        "rows": data_rows,
                                        "fields": "userEnteredValue"
                                    }
                                };
                                requestList.push(data_request);
                                var currentId = google_utils.getIdOnArray(req, currentRow);
                                var log_rows = new Array();

                                var log_msg = con.SYNC_STATUS_PENDING;
                                var log_r = { values: [] };
                                log_r.values.push({ userEnteredValue: { "stringValue": currentId } }); ///Id
                                log_r.values.push({ userEnteredValue: { "stringValue": "TRACE" } }); //Type
                                log_r.values.push({ userEnteredValue: { "stringValue": (new Date()).toString() } }); //Date
                                log_r.values.push({ userEnteredValue: { "stringValue": log_msg } }); //Message
                                log_rows.push(log_r);
                                log_request = {
                                    "appendCells": {
                                        "sheetId": req.sf_sync.sheets.log_id,
                                        "rows": log_rows,
                                        "fields": "userEnteredValue"
                                    }
                                };
                                requestList.push(log_request);
                            }
                        }
                    }

                }
                if (requestList.length > 0) {
                    set_row_status_on_multiple(req, res, requestList, function() {
                        return callback(null, req, res);
                    });
                }

            } else {
                if (LOG_DEBUG) console.log("get_sync_edit_rows_content ssync_status_col:" + sync_status_col);
            }

        }
    });
}


function get_sync_edit_row_content(req, res, callback) {
    if (LOG_TRACE) console.log("get_sync_edit_row ENTER");
    if (LOG_DEBUG) console.log('get_sync_edit_row_content - rows: ' + req.sf_sync.rows);

    if (req.sf_sync.rows != undefined && req.sf_sync.rows.length > 1) {
        get_sync_edit_rows_content(req, res, callback);
    } else {
        var rowNumber = req.sf_sync.row_index + 1;
        google_sheet_utils.get_rows(req.sf_sync.doc_id, req.sf_sync.sheets.data_id, req.sf_sync.google_access_token, "DATA!" + rowNumber + ":" + rowNumber, function(err, data) {

            if (err) {
                if (LOG_ERROR) console.log('get_sync_edit_row_content - get_rows error: ' + err);
                return callback(err, req, res);
            } else {

                setSyncSatusColumn(req);
                var sync_status_col = req.sf_sync["sync_status_col"];
                if (sync_status_col != undefined && sync_status_col > 0) {
                    var currentRow = data.values[0];
                    if (currentRow.length > sync_status_col) {
                        if (currentRow[sync_status_col] == con.SYNC_STATUS_EDIT) {
                            req.sf_sync.sobject = currentRow;

                            req.sf_sync.status = con.SYNC_STATUS_PENDING;
                            req.sf_sync.status_msg = "";
                            set_row_status_on_single(req, res, function() {
                                callback(null, req, res);
                            });
                        }
                    }

                } else {
                    if (LOG_DEBUG_VERBOSE) console.log("sync_status_col:" + sync_status_col);
                }
            }
        });
    }
}



function getRowValue(arr, i) {
    var v = "";
    if (i < arr.length) {
        v = arr[i];
    }
    return v;
}

function getRequestStoredValue(req, p) {
    var v = "";
    if (req.sf_sync != undefined && req.sf_sync[p] != undefined) {
        v = req.sf_sync[p];
    }
    return v;
}

function setSyncSatusColumn(req) {
    if (req.sf_sync.sobject_metadata_list != undefined && req.sf_sync["sync_status_col"] == undefined) {
        var sync_status_col = req.sf_sync.sobject_metadata_list.length - 3;
        for (var i = req.sf_sync.sobject_metadata_list.length; i--;) {
            if (req.sf_sync.sobject_metadata_list[i] == "sync_status") {
                sync_status_col = i;
                break;
            }
        }
        req.sf_sync["sync_status_col"] = sync_status_col;
    }
}


function set_row_status_on_single(req, res, callback) {
    if (LOG_TRACE) console.log("set_row_status_on_single ENTER");

    var rows = Array();
    var r = { values: [] };
    r.values.push({ userEnteredValue: { "stringValue": getRequestStoredValue(req, "status") } });
    //console.log(r);
    r.values.push({ userEnteredValue: { "stringValue": "" } });
    r.values.push({ userEnteredValue: { "stringValue": getRequestStoredValue(req, "status_msg") } });
    rows.push(r);

    var rowNumber = req.sf_sync.row_index;
    setSyncSatusColumn(req);
    var sync_status_col = req.sf_sync["sync_status_col"];
    if (req.sf_sync.sheets != undefined && req.sf_sync.sheets.data_id != undefined) {

        var log_request = null;
        if (req.sf_sync.sheets.log_id != undefined) {
            var log_rows = Array();

            var currentId = google_utils.getId(req);

            var log_msg = getRequestStoredValue(req, "status") + " " + getRequestStoredValue(req, "status_msg");
            var log_r = { values: [] };
            log_r.values.push({ userEnteredValue: { "stringValue": currentId } }); ///Id
            log_r.values.push({ userEnteredValue: { "stringValue": "TRACE" } }); //Type
            log_r.values.push({ userEnteredValue: { "stringValue": (new Date()).toString() } }); //Date
            log_r.values.push({ userEnteredValue: { "stringValue": log_msg } }); //Message
            log_rows.push(log_r);
            log_request = {
                "appendCells": {
                    "sheetId": req.sf_sync.sheets.log_id,
                    "rows": log_rows,
                    "fields": "userEnteredValue"
                }
            };
        }

        google_sheet_utils.update_rows(req.sf_sync.doc_id, req.sf_sync.sheets.data_id, req.sf_sync.google_access_token, rows, rowNumber, sync_status_col, log_request, function(err, worksheet) {
            // the user may have deleted the document... just create a new one.
            if (err) {
                if (LOG_ERROR) console.log('set_row_status_on_single error: ' + err);
                //res.json({ error: true, message: err.message });
            }
            callback();
        });
    } else {
        if (LOG_DEBUG_VERBOSE) console.log('INVALID DATA SHEET ID');
    }
    if (LOG_TRACE) console.log("set_row_status_on_single EXIT");
}

function set_row_status_on_multiple(req, res, requestList, callback) {
    if (LOG_TRACE) console.log("set_row_status_on_multiple ENTER");

    google_sheet_utils.update_multiple_request(req.sf_sync.doc_id, req.sf_sync.google_access_token, requestList, function(err, worksheet) {
        // the user may have deleted the document... just create a new one.
        if (err) {
            if (LOG_ERROR) console.log('set_row_status_on_multiple - error: ' + err);
        }
        callback();
    });

    if (LOG_TRACE) console.log("set_row_status_on_multiple EXIT");
}
/**
 *
 */
this.set_row_status = function(req, res) {
    set_row_status_on_single(req, res, function() {
        if (LOG_DEBUG_VERBOSE) console.log("updated cell");
    });
}




this.set_row_status_multiple_result = function(req, res) {

    setSyncSatusColumn(req);
    var sync_status_col = req.sf_sync["sync_status_col"];

    var requestList = [];

    for (var z = 0; z < req.sf_sync.google_rows.length; z++) {
        //var recordCounter = z+1;
        var batchIndex = Math.floor(z / 25);
        var resultIndex = (z % 25);

        var currentRow = req.sf_sync.google_rows[z];

        var result_status = "";
        //var result_msg = "";
        var result_msg = "";
        if (req.sfdc_batch[batchIndex] != undefined && req.sfdc_batch[batchIndex].RESULT.results[resultIndex] != undefined) {

            var currentRow_result = req.sfdc_batch[batchIndex].RESULT.results[resultIndex];
            if (currentRow_result && currentRow_result.statusCode < 300) {
                result_status = con.SYNC_STATUS_SUCCESS;
            } else if (currentRow_result.result != undefined && currentRow_result.result.length > 0) {
                var msgs = new Array();
                for (var y = 0; y < currentRow_result.result.length; y++) {
                    var r = currentRow_result.result[y];
                    if (r.message != undefined) {
                        msgs.push(r.errorCode + " " + r.message);
                    }
                }
                result_status = con.SYNC_STATUS_ERROR;

                result_msg = msgs.join(";");

            } else {
                result_status = con.SYNC_STATUS_ERROR;
            }

        } else {
            result_status = con.SYNC_STATUS_ERROR;
            result_msg = "missing request!";
            if (LOG_DEBUG_VERBOSE) console.log(req.sfdc_batch[batchIndex]);
            if (LOG_DEBUG_VERBOSE) console.log(req.sfdc_batch[batchIndex].RESULT.results[resultIndex]);
        }

        var data_rows = new Array();
        var r = { values: [] };
        r.values.push({ userEnteredValue: { "stringValue": result_status } });
        r.values.push({ userEnteredValue: { "stringValue": "" } });
        r.values.push({ userEnteredValue: { "stringValue": result_msg } });
        data_rows.push(r);

        var data_request = {
            "updateCells": {
                "start": {
                    "sheetId": req.sf_sync.sheets.data_id,
                    "rowIndex": req.sf_sync.rows[z] - 1,
                    "columnIndex": sync_status_col
                },
                "rows": data_rows,
                "fields": "userEnteredValue"
            }
        };

        requestList.push(data_request);

        var currentId = google_utils.getIdOnArray(req, currentRow);
        var log_rows = new Array();

        //var log_msg = con.SYNC_STATUS_PENDING;
        var log_r = { values: [] };
        log_r.values.push({ userEnteredValue: { "stringValue": currentId } }); ///Id
        log_r.values.push({ userEnteredValue: { "stringValue": result_status } }); //Type
        log_r.values.push({ userEnteredValue: { "stringValue": (new Date()).toString() } }); //Date
        log_r.values.push({ userEnteredValue: { "stringValue": result_msg } }); //Message
        log_rows.push(log_r);
        log_request = {
            "appendCells": {
                "sheetId": req.sf_sync.sheets.log_id,
                "rows": log_rows,
                "fields": "userEnteredValue"
            }
        };

        requestList.push(log_request)

    }
    //console.log("set_row_status_multiple_result requestList.length=" + requestList.length);
    if (requestList.length > 0) {
        set_row_status_on_multiple(req, res, requestList, function() {
            //callback(null, req, res);
        });
    } else {
        if (LOG_DEBUG_VERBOSE) console.log("EMPTY REQUEST");
    }

}

exports.get_metadata = get_metadata;
exports.handle_trigger = handle_trigger;
exports.get_sync_edit_row = get_sync_edit_row;