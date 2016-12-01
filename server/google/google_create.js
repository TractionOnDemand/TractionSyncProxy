/**
 * google_sync.js
 * @description : Handle Google Document creation
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
var express = require('express');
var request = require('request');
var googleApis = require('googleapis');
var googleAuth = require('google-auth-library');
var google_logs = require('google/google_logs');
// Local Modules
var google_security = require('google/google_security');
var google_utils = require('google/google_utils');
var google_sheet_utils = require('google/google_sheet_utils');
const con = require('const/const');


var gAuth = new googleAuth();
var oauth2Client = new gAuth.OAuth2(google_security.GOOGLE_CLIENT_ID,
    google_security.GOOGLE_CLIENT_SECRET,
    google_security.GOOGLE_CALLBACK_URL);

var drive = googleApis.drive({ version: google_utils.apiVersion, auth: oauth2Client });

// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;




/**
 * Initialize a google spreadsheet document by clearing all existing data (if the document already exists)
 * or creating a brand new document.
 * @author  Ricardo Visbal, Doug Jodrell Traction on Demand
 * @date  2016-Jul-25
 */
function init_spreadsheet(req, res, callback) {
    if (LOG_TRACE) console.log('init_spreadsheet ENTER');
    if (LOG_DEBUG) console.log('init_spreadsheet: existing doc ID: ' + req.sf_sync.doc_id);

    var access_token = req.sf_sync.google_access_token;

    // setup the google oauth token for this user.
    oauth2Client.setCredentials({
        access_token: access_token,
        refresh_token: req.sf_sync.google_refresh_token
    });

    req.sf_sync.sheets = {};
    req.sf_sync.sheets.data_id = 0;
    req.sf_sync.sheets.metadata_id = 1;
    req.sf_sync.sheets.logs_id = 2;
    // if a previous document ID exists
    if (req.sf_sync.doc_id) {
        try {

            // insert a new worksheet at index 0
            google_sheet_utils.insert_sheet(req.sf_sync.doc_id, null, access_token, 0, function(err, worksheet) {

                // the user may have deleted the document... just create a new one.
                if (err) {
                    if (LOG_ERROR) console.log('init_spreadsheet error: ' + err);
                    return create_spreadsheet(req, res, callback);
                }

                // get all the worksheets in this spreadsheet document
                google_sheet_utils.get_sheets(req.sf_sync.doc_id, access_token, function(err, spreadsheet) {

                    // if there was an error opening the document, just create a new one.
                    if (err) return create_spreadsheet(req, res, callback);

                    // the document is good, so get the urls
                    req.sf_sync.sheet_url = google_utils.getDocUrl(req.sf_sync.doc_id);
                    req.sf_sync.macro_url = google_utils.getMacroUrl(req.sf_sync.doc_id);

                    req.sf_sync.sheets.data_id = spreadsheet.sheets[0].properties.sheetId;
                    //req.sf_sync.sheets.metadata_id = spreadsheet.sheets[0].properties.sheetId;
                    //req.sf_sync.sheets.log_id = spreadsheet.sheets[0].properties.sheetId;
                    // delete all the worksheets except the new one that we just added.
                    var sheets_to_delete = spreadsheet.sheets.length - 1;
                    for (var i = 1; i < spreadsheet.sheets.length; i++) {
                        var worksheet = spreadsheet.sheets[i];
                        if (LOG_DEBUG_VERBOSE) console.log('Sheet: ' + JSON.stringify(worksheet));
                        if (LOG_DEBUG) console.log('Sheet ID: ' + worksheet.properties.sheetId);
                        if (LOG_DEBUG) console.log('Sheet Name: ' + worksheet.properties.title);

                        google_sheet_utils.delete_sheet(req.sf_sync.doc_id, worksheet.properties.sheetId, access_token, function(err, result) {
                            if (err) {
                                if (LOG_ERROR) console.log('init_spreadsheet - delete_sheet failed: ' + err);
                            }

                            // continue only after all the old sheets have been deleted.
                            if (--sheets_to_delete === 0) return callback(null, req, res);
                        });
                    }
                });
            });

            // there was a problem with the existing sheet, so just create a new one.
        } catch (exception) {
            if (LOG_ERROR) console.log('init_spreadsheet exception: ' + exception);
            return create_spreadsheet(req, res, callback);
        }

        // no sheet exists
    } else {
        return create_spreadsheet(req, res, callback);
    }
    if (LOG_TRACE) console.log('init_spreadsheet EXIT');
}


/**
 * Create a new google sheet document.
 * @author  Ricardo Visbal, Traction on Demand
 * @date  2016-Jul-25
 */
function create_spreadsheet(req, res, callback) {

    if (LOG_TRACE) console.log('create_spreadsheet ENTER');
    var spreadsheetName = req.sf_sync.list_data.label;
    var fileMetadata = {
        'name': 'Salesforce - ' + spreadsheetName,
        'mimeType': 'application/vnd.google-apps.spreadsheet'
    };

    drive.files.create({
        resource: fileMetadata
    }, function(err, file) {
        if (err) {
            if (LOG_ERROR) console.log('create_spreadsheet Error:' + err);
            return callback(err, req, res);
        }
        if (LOG_DEBUG) console.log('create_spreadsheet - new document ID: ' + file.id);
        req.sf_sync.doc_id = file.id;
        req.sf_sync.sheet_url = google_utils.getDocUrl(file.id);
        req.sf_sync.macro_url = google_utils.getMacroUrl(file.id);
        callback(null, req, res);
    });
}



/**
 * Add a worksheet with the field picklist values.
 * @author  Ricardo Visbal, Doug Jodrell Traction on Demand
 * @date  2016-08-04
 */
function add_sheet_meta(req, res, callback) {
    if (LOG_TRACE) console.log('add_sheet_meta ENTER');

    var token = req.sf_sync.google_access_token;
    if (LOG_DEBUG_VERBOSE) console.log('add_sheet_meta - token: ' + token);

    // insert a new worksheet at index 0
    google_sheet_utils.insert_sheet(req.sf_sync.doc_id, null, token, 1, function(err, worksheet) {

        // the user may have deleted the document... just create a new one.
        if (err) {
            if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
        }

        // get all the sheets
        google_sheet_utils.get_sheets(req.sf_sync.doc_id, token, function(err, spreadsheet) {

            // if there was an error opening the document, just create a new one.
            if (err) {
                if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
            }

            // the document is good, so get the urls
            req.sf_sync.sheets.metadata_id = spreadsheet.sheets[1].properties.sheetId;

            var header_rows = buildHeaderRow(req, res);
            if (LOG_DEBUG_VERBOSE) console.log(header_rows);
            google_sheet_utils.add_sheet_header(req.sf_sync.doc_id, req.sf_sync.sheets.metadata_id, token, "METADATA", header_rows, 200, function(err, worksheet) {

                // the user may have deleted the document... just create a new one.
                if (err) {
                    if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
                } else {
                    var picklist_insert = Array();
                    var rows = Array();
                    var row_name = { values: [] };
                    var row_type = { values: [] };
                    var row_label = { values: [] };
                    var row_updatable = { values: [] };
                    var row_picklistCount = { values: [] };

                    for (var y = 0; y < req.sf_sync.columns.length; y++) {
                        var c = req.sf_sync.columns[y];

                        var col_Name = "";
                        var col_Type = "";
                        var col_Label = "";
                        var col_Updateable = "";
                        var col_PicklistCount = 0;
                        if (c.Metadata != undefined) {
                            if (c.Metadata.name != undefined) {
                                col_Name = c.Metadata.name;
                            }
                            if (c.Metadata.type != undefined) {
                                col_Type = c.Metadata.type;
                                if (col_Type == "picklist") {
                                    var p = {
                                        ColumnIndex: y,
                                        Rows: new Array()
                                    }
                                    for (var j = 0; j < c.Metadata.picklist.length; j++) {
                                        var plv_row = { values: [] };
                                        plv_row.values.push({ userEnteredValue: { "stringValue": c.Metadata.picklist[j] } });
                                        p.Rows.push(plv_row);
                                    }
                                    picklist_insert.push(p);
                                    col_PicklistCount = c.Metadata.picklist.length;
                                }
                            }
                            if (c.Metadata.label != undefined) {
                                col_Label = c.Metadata.label;
                            }
                            if (c.Metadata.updateable != undefined) {
                                col_Updateable = c.Metadata.updateable;
                            }

                        }

                        row_name.values.push({ userEnteredValue: { "stringValue": col_Name } });
                        row_type.values.push({ userEnteredValue: { "stringValue": col_Type } });
                        row_label.values.push({ userEnteredValue: { "stringValue": col_Label } });
                        row_updatable.values.push({ userEnteredValue: { "stringValue": col_Updateable } });
                        row_picklistCount.values.push({ userEnteredValue: { "numberValue": col_PicklistCount } });
                    }
                    rows.push(row_name);
                    rows.push(row_type);
                    rows.push(row_label);
                    rows.push(row_updatable);
                    rows.push(row_picklistCount);

                    google_sheet_utils.add_rows(req.sf_sync.doc_id, req.sf_sync.sheets.metadata_id, token, rows, 1, 0, function(err, worksheet) {
                        // the user may have deleted the document... just create a new one.
                        if (err) {
                            if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
                            callback(err, req, res);
                        } else {

                            for (var z = 0; z < picklist_insert.length; z++) {
                                var plf = picklist_insert[z];
                                google_sheet_utils.add_rows(req.sf_sync.doc_id, req.sf_sync.sheets.metadata_id, token, plf.Rows, 6, plf.ColumnIndex, function(err, worksheet) {
                                    // the user may have deleted the document... just create a new one.
                                    if (err) {
                                        if (LOG_ERROR) console.log('add_sheet_meta error: ' + err);
                                    }
                                });

                            }
                            callback(null, req, res);
                        }
                    });
                    google_logs.createLogSheet(req);
                }
            });
        });
    });
    if (LOG_TRACE) console.log('add_sheet_meta EXIT');
}

function buildHeaderRow(req) {
    var rows = Array();
    var r = { values: [] };
    for (var y = 0; y < req.sf_sync.list_data.columns.names.length; y++) {
        var columnName = req.sf_sync.list_data.columns.names[y];
        r.values.push({
            userEnteredValue: { "stringValue": columnName }
        });
    }
    rows.push(r);
    return rows;
}

/**
 * Add data to a Google sheet.
 * @author  Ricardo Visbal, Traction on Demand
 * @date  2016-Jul-25
 */
function fill_sheet(req, res, callback) {
    if (LOG_TRACE) console.log('fill_sheet ENTER');

    var spreadsheet_id = req.sf_sync.doc_id;
    var sheet_data_id = 0;
    if (req.sf_sync.sheets != undefined && req.sf_sync.sheets.data_id != undefined) {
        sheet_data_id = req.sf_sync.sheets.data_id;
    }
    var token = req.sf_sync.google_access_token;

    var rows = buildHeaderRow(req, res);

    google_sheet_utils.add_sheet_header(spreadsheet_id, sheet_data_id, token, "DATA", rows, req.sf_sync.list_data.rows.length, function(err, worksheet) {

        // the user may have deleted the document... just create a new one.
        if (err) {
            if (LOG_ERROR) console.log('add_sheet_header error: ' + err);
            callback(err, req, res);
        } else {
            callback(null, req, res);
        }

    });

    if (LOG_TRACE) console.log('fill_sheet EXIT');
}


function JSDateToExcelDate(inDate) {
    var returnDateTime = 25569.0 + ((inDate.getTime() - (inDate.getTimezoneOffset() * 60 * 1000)) / (1000 * 60 * 60 * 24));
    return returnDateTime.toString().substr(0, 5);

}


function add_rows_sheet(req, res) {

    var spreadsheet_id = req.body.spreadsheet_id;
    var sheet_data_id = req.body.sheet_data_id;
    var token = req.body.token;
    var columns = req.body.columns;
    var batchRows = req.body.batchRows;
    var startRowIndex = req.body.startRowIndex;
    var isLastRow = req.body.isLastRow;

    var rows = Array();
    for (var x = 0; x < batchRows.length; x++) {
        var br = batchRows[x];

        var r = { values: [] };
        for (var y = 0; y < columns.length; y++) {
            var c = columns[y];
            var columnValue = "";
            if (br[c.Name]) {
                columnValue = br[c.Name];
            }

            var cell_data = { userEnteredValue: { "stringValue": columnValue } };
            /*
            "numberValue": number, "currency""percent""double"
            "stringValue": string,
            "boolValue": boolean,type: "boolean"
            "formulaValue": string,
            "errorValue": {
                object(ErrorValue)
            },
            */
            if (c.Metadata != undefined) {
                if (c.Metadata.type == "number" || c.Metadata.type == "currency" || c.Metadata.type == "percent" || c.Metadata.type == "double") {
                    cell_data = { userEnteredValue: { "numberValue": columnValue } };
                }


                if (c.Metadata.type == "date") {
                    if (LOG_DEBUG_VERBOSE) console.log(columnValue);
                    var d = new Date(columnValue);
                    var d_utc = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
                    /*
                    var d = new Date(columnValue);
                    var dd = d.getDate();
                    var mm = d.getMonth() + 1; //January is 0!
                    var yyyy = d.getFullYear();
                    var shortDate = mm + "/" + dd + "/" + yyyy;
                    */
                    var serialValue = JSDateToExcelDate(d_utc);
                    //console.log("serialValue=" + serialValue);
                    cell_data = { userEnteredValue: { "numberValue": serialValue } };
                }
                //add_rows error: Invalid value at 'requests[0].update_cells.rows[0].values[4].user_entered_value.number_value' (TYPE_DOUBLE), "Sat Sep 24 2016"

                if (c.Metadata.updateable != undefined && c.Metadata.updateable == "false") {
                    cell_data["userEnteredFormat"] = {
                        "textFormat": {
                            "foregroundColor": {
                                "red": 0.54,
                                "green": 0.54,
                                "blue": 0.54
                            }
                        }
                    };
                }
            }

            r.values.push(cell_data);
        }

        rows.push(r);
    }



    google_sheet_utils.add_rows(spreadsheet_id, sheet_data_id, token, rows, startRowIndex, 0, function(err, worksheet) {
        // the user may have deleted the document... just create a new one.
        if (err) {
            if (LOG_ERROR) console.log('add_rows error: ' + err);
            res.json({ error: true, message: err.message });
        } else {
            if (isLastRow) {
                //FORMAT CELLS
                google_sheet_utils.format_cells(spreadsheet_id, sheet_data_id, token, columns, startRowIndex, rows.length, function(err, worksheet) {
                    if (err) {
                        if (LOG_ERROR) console.log('add_rows - format_cells error: '+err.message);
                        res.json({ error: true, message: err.message });
                    } else {
                        res.json({ error: false, message: "success" });
                    }
                });
            } else {
                res.json({ error: false, message: "success" });
            }
        }
    });
}

function align_column_width(req, res, callback) {

    // align the column width
    var uri = google_utils.google_web_app_url + "?action=alignColumns&docId=" + req.sf_sync.doc_id;
    request({
            url: uri,
            headers: {
                "Authorization": "Bearer " + req.sf_sync.google_access_token
            }
        },
        function(err, response, body) {
            if (err) {
                if (LOG_ERROR) console.log(error);
                return callback(err.message, req, res);
            }
            if (response.statusCode != 200) {
                if (LOG_ERROR) console.log('createRequest response: ' +response);
            }
            return callback(null, req, res);
        });

}

exports.add_rows_sheet = add_rows_sheet;
exports.init_spreadsheet = init_spreadsheet;
exports.fill_sheet = fill_sheet;
exports.align_column_width = align_column_width;
exports.add_sheet_meta = add_sheet_meta;