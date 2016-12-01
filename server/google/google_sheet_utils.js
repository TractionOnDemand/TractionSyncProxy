/**
 * google_sheet_utils.js
 * @description : V4 API for Google Sheets
 * @author Doug Jodrell, Ricardo Visbal Traction on Demand
 * @date Aug 16, 2016
 */

var request = require('request');

const API_URL = 'https://sheets.googleapis.com/v4/spreadsheets/';

// enable/disable logging
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;

const DEFAULT_NOF_COLS = 26;
const DEFAULT_NOF_ROWS = 25;

/**
 * Get the information for the current google sheet.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-15
 */
this.get_sheets = function(spreadsheet_id, auth_token, callback) {

    if (LOG_TRACE) console.log('get_sheets - ENTER');

    var opts = {
        "spreadsheet_id": spreadsheet_id,
        "query_string": '?includeGridData=false',
        "method": 'GET',
        "auth_token": auth_token
    }

    api_request(opts, function(err, result, data) {

        if (!err && result.statusCode > 299) {
            err = data.error.message;
        }
        return callback(err, data);
    });
}

/**
 * Delete the specified worksheet from a google spreadsheet document.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-16
 */
this.delete_sheet = function(spreadsheet_id, worksheet_id, auth_token, callback) {
    if (LOG_TRACE) console.log('delete_sheet - ENTER');
    var jsonBody = {
        "requests": [
            { "deleteSheet": { "sheetId": worksheet_id } }
        ]
    }

    var opts = {
        spreadsheet_id: spreadsheet_id,
        query_string: ':batchUpdate',
        method: 'POST',
        auth_token: auth_token,
        body: JSON.stringify(jsonBody)
    }

    api_request(opts, function(err, result, data) {
        if (!err && result.statusCode > 299) {
            err = data.error.message;
        }
        return callback(err, data);
    });

}

/**
 * Create a worksheet in the specified google spreadsheet ID.
 * The new sheet will be inserted at index 0.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-16
 */
this.insert_sheet = function(spreadsheet_id, sheet_name, auth_token, sheet_index, callback) {
    if (LOG_TRACE) console.log('insert_sheet - ENTER');

    var requestList = [];
    var r = {
        "requests": [{
            "addSheet": {
                "properties": {
                    "title": sheet_name,
                    "index": sheet_index,
                    "gridProperties": {
                        "rowCount": DEFAULT_NOF_ROWS,
                        "columnCount": DEFAULT_NOF_COLS
                    },
                    "tabColor": {
                        "red": 1.0,
                        "green": 0.3,
                        "blue": 0.4
                    }
                }
            }
        }]
    }

    requestList = requestList.concat(r.requests);
    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);
}


/**
 * Delete all rows from the specified worksheet in a google spreadsheet document.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-15
 */
this.clear_sheet = function(spreadsheet_id, worksheet, auth_token, callback) {

    if (LOG_TRACE) console.log('clear_sheet - ENTER');

    // TODO: try/catch
    var requestList = [];
    var r = {
        "requests": [{
            "deleteDimension": {
                "range": {
                    "sheetId": worksheet.properties.sheetId,
                    "dimension": "ROWS",
                    "startIndex": 0,
                    "endIndex": worksheet.properties.gridProperties.rowCount - 1
                }
            }
        }, {
            "deleteDimension": {
                "range": {
                    "sheetId": worksheet.properties.sheetId,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": worksheet.properties.gridProperties.columnCount - 1
                }
            }
        }]
    };
    requestList = requestList.concat(r.requests);
    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);
}


this.grow_sheet = function(spreadsheet_id, worksheet_id, nof_rows, nof_cols, auth_token, callback) {
    if (LOG_TRACE) console.log('grow_sheet - ENTER');

    // build the request body
    var requestList = [];
    if (nof_rows > 0) {
        requestList.push({
            "insertDimension": {
                "range": {
                    "sheetId": worksheet_id,
                    "dimension": "ROWS",
                    "startIndex": 0,
                    "endIndex": nof_rows - 1
                }
            }
        });
    }
    if (nof_cols > 0) {
        requestList.push({
            "insertDimension": {
                "range": {
                    "sheetId": worksheet_id,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": nof_cols - 1
                }
            }
        });
    }

    // nothing to do.
    if (requestList.length == 0) {
        return callback('Invalid number of rows and columns', worksheet_id);
    }

    //if (log_request != null) {
    //    requestList.push(log_request);
    //}

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);
}



this.add_sheet_header = function(spreadsheet_id, worksheet_id, auth_token, sheet_title, header_row, nof_rows, callback) {
    if (LOG_TRACE) console.log('add_sheet_header - ENTER');
    /*
     "red": 0.94,
                            "green": 0.94,
                            "blue": 0.94
     "tabColor": {
                            "red": 0.21,
                            "green": 0.47,
                            "blue": 0.86
                        }
                        */
    var requestList = [];
    var r = {
        "requests": [{
            "insertDimension": {
                "range": {
                    "sheetId": worksheet_id,
                    "dimension": "ROWS",
                    "startIndex": 0,
                    "endIndex": nof_rows
                }
            }
        }, {
            "repeatCell": {
                "range": {
                    "sheetId": worksheet_id,
                    "startRowIndex": 0,
                    "endRowIndex": 1
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {
                            "red": 0.05,
                            "green": 0.55,
                            "blue": 1
                        },
                        "horizontalAlignment": "CENTER",
                        "textFormat": {
                            "foregroundColor": {
                                "red": 1,
                                "green": 1,
                                "blue": 1
                            },
                            "fontSize": 10,
                            "bold": true
                        }
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
            }
        }, {
            "updateCells": {
                "start": {
                    "sheetId": worksheet_id,
                    "rowIndex": 0,
                    "columnIndex": 0
                },
                "rows": header_row,
                "fields": "userEnteredValue"
            }
        }, {
            "updateSheetProperties": {
                "properties": {
                    "sheetId": worksheet_id,
                    "title": sheet_title,
                    "gridProperties": {
                        "frozenRowCount": 1
                    }
                },
                "fields": "title,gridProperties.frozenRowCount"
            }
        }]
    }
    requestList = requestList.concat(r.requests);
    //if (log_request != null) {
    //    requestList.push(log_request);
    //}

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);

}

this.add_rows = function(spreadsheet_id, worksheet_id, auth_token, rows, startRowIndex, startColIndex, callback) {
    if (LOG_TRACE) console.log('add_rows - ENTER');

    var requestList = [];
    var r = {
        "requests": [{
                "updateCells": {
                    "start": {
                        "sheetId": worksheet_id,
                        "rowIndex": startRowIndex,
                        "columnIndex": startColIndex
                    },
                    "rows": rows,
                    "fields": "userEnteredValue,userEnteredFormat(textFormat)"
                }
            }

        ]
    }

    requestList = requestList.concat(r.requests);
    //if (log_request != null) {
    //    requestList.push(log_request);
    //}

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);

}



this.format_cells = function(spreadsheet_id, worksheet_id, auth_token, columns, startRowIndex, rowCount, callback) {
    if (LOG_TRACE) console.log('add_rows - ENTER');


    var requestList = [];
    for (var y = 0; y < columns.length; y++) {
        var c = columns[y];
        var columnNumber = y + 1;

        if (c.Metadata != undefined) {
            var range = {
                "sheetId": worksheet_id,
                "startRowIndex": 1,
                "endRowIndex": startRowIndex + rowCount,
                "startColumnIndex": y,
                "endColumnIndex": columnNumber
            };
            if (LOG_DEBUG_VERBOSE) console.log("c.Metadata.type=" + c.Metadata.type + " startRowIndex=" + startRowIndex + " columnNumber=" + columnNumber);
            if (c.Metadata.type == "currency") {
                var r = {
                    "repeatCell": {
                        "range": range,
                        "cell": {
                            "userEnteredFormat": {
                                "numberFormat": {
                                    "type": "CURRENCY"
                                }
                            }
                        },
                        "fields": "userEnteredFormat.numberFormat"
                    }
                };

                //console.log(r);
                requestList.push(r);

            } else if (c.Metadata.type == "date") {
                var r = {
                    "repeatCell": {
                        "range": range,
                        "cell": {
                            "userEnteredFormat": {
                                "numberFormat": {
                                    "type": "DATE",
                                    "pattern": "mm/dd/yyyy"
                                }
                            }
                        },
                        "fields": "userEnteredFormat.numberFormat"
                    }
                };
                //console.log(r);
                requestList.push(r);
            } else if (c.Metadata.name.toLowerCase() == "probability") {
                //red
                var condition1 = {
                    "addConditionalFormatRule": {
                        "rule": {
                            "ranges": range,
                            "booleanRule": {
                                "condition": {
                                    "type": "NUMBER_LESS_THAN_EQ",
                                    "values": [{
                                        "userEnteredValue": "39"
                                    }]
                                },
                                "format": {
                                    "backgroundColor": {
                                        "red": 0.99,
                                        "green": 0.1,
                                        "blue": 0.2
                                    }
                                }
                            }
                        },
                        "index": 0
                    }
                };
                //console.log(r);
                requestList.push(condition1);

                //yellow
                var condition2 = {
                    "addConditionalFormatRule": {
                        "rule": {
                            "ranges": range,
                            "booleanRule": {
                                "condition": {
                                    "type": "NUMBER_BETWEEN",
                                    "values": [{
                                        "userEnteredValue": "39"
                                    }, {
                                        "userEnteredValue": "69"
                                    }]
                                },
                                "format": {
                                    "backgroundColor": {
                                        "red": 1,
                                        "green": 0.98,
                                        "blue": 0.0
                                    }
                                }
                            }
                        },
                        "index": 1
                    }
                };
                //console.log(r);
                requestList.push(condition2);
                //green
                var condition3 = {
                    "addConditionalFormatRule": {
                        "rule": {
                            "ranges": range,
                            "booleanRule": {
                                "condition": {
                                    "type": "NUMBER_GREATER_THAN_EQ",
                                    "values": [{
                                        "userEnteredValue": "70"
                                    }]
                                },
                                "format": {
                                    "backgroundColor": {
                                        "red": 0.55,
                                        "green": 0.93,
                                        "blue": 0.55
                                    }
                                }
                            }
                        },
                        "index": 2
                    }
                };
                //console.log(r);
                requestList.push(condition3);
            } else if (c.Metadata.type == "picklist") {
                var colName = toA1ColumnName(columnNumber);
                var endCol = c.Metadata.picklist.length + 7;
                var picklistRange = "=METADATA!" + colName + "7:" + colName + endCol;
                if (LOG_DEBUG_VERBOSE) console.log("picklistRange=" + picklistRange);
                var r = {
                    "setDataValidation": {
                        "range": range,
                        "rule": {
                            "condition": {
                                "type": "ONE_OF_RANGE",
                                "values": [{
                                    "userEnteredValue": picklistRange
                                }],
                            },
                            "inputMessage": "Value must be in the list",
                            "strict": true,
                            "showCustomUi": true
                        }
                    }
                };
                //console.log(r);
                requestList.push(r);
            }

            if (c.Metadata.updateable != undefined && c.Metadata.updateable != null) {
                if (c.Metadata.updateable.toLowerCase() == 'false') {
                    var r = {
                        "addProtectedRange": {
                            "protectedRange": {
                                "range": range,
                                "description": "Read Only cell",
                                "warningOnly": true
                            }
                        }
                    };
                    //console.log(r);
                    requestList.push(r);
                }
            }

        }
    }

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);

}


this.append_rows = function(spreadsheet_id, worksheet_id, auth_token, rows, startRowIndex, startColIndex, callback) {
    if (LOG_TRACE) console.log('append_rows - ENTER');
    var requestList = [];
    var r = {
        "requests": [{
                "appendCells": {
                    "sheetId": worksheet_id,
                    "rows": rows,
                    "fields": "userEnteredValue"
                }
            }

        ]
    }
    requestList = requestList.concat(r.requests);
    //if (log_request != null) {
    //    requestList.push(log_request);
    //}

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);

}

this.update_rows = function(spreadsheet_id, worksheet_id, auth_token, rows, startRowIndex, startColIndex, log_request, callback) {
    if (LOG_TRACE) console.log('update_rows - ENTER');

    var requestList = [];
    var r = {
        "updateCells": {
            "start": {
                "sheetId": worksheet_id,
                "rowIndex": startRowIndex,
                "columnIndex": startColIndex
            },
            "rows": rows,
            "fields": "userEnteredValue"
        }
    };

    requestList.push(r);
    if (log_request != null) {
        requestList.push(log_request);
    }

    this.update_multiple_request(spreadsheet_id, auth_token, requestList, callback);
}

this.update_multiple_request = function(spreadsheet_id, auth_token, requestList, callback) {
    if (LOG_TRACE) console.log('update_multiple_request - ENTER');

    var jsonBody = {
        "requests": []
    }
    for (var x = 0; x < requestList.length; x++) {
        jsonBody.requests.push(requestList[x]);
    }
    var opts = {
        spreadsheet_id: spreadsheet_id,
        query_string: ':batchUpdate',
        method: 'POST',
        auth_token: auth_token,
        body: JSON.stringify(jsonBody)
    }

    api_request(opts, function(err, result, data) {
        if (!err && result.statusCode > 299) {
            err = data.error.message;
            //console.log(data);
            //console.log(jsonBody);
        }
        return callback(err, data);
    });

}


//ranges	string	The A1 notation of the values to retrieve.
//majorDimension
this.batchGet_rows = function(spreadsheet_id, worksheet_id, auth_token, qs, callback) {
    if (LOG_TRACE) console.log('batchGet_rows - ENTER');

    var jsonBody = {}
    var opts = {
        spreadsheet_id: spreadsheet_id,
        query_string: '/values:batchGet?' + qs,
        method: 'GET',
        auth_token: auth_token,
        body: JSON.stringify(jsonBody)
    }

    api_request(opts, function(err, result, data) {
        if (!err && result.statusCode > 299) {
            err = data.error.message;
        }
        return callback(err, data);
    });

}

this.get_rows = function(spreadsheet_id, worksheet_id, auth_token, range_a1_notation, callback) {
    if (LOG_TRACE) console.log('get_rows - ENTER');

    var jsonBody = {}
    var opts = {
        spreadsheet_id: spreadsheet_id,
        query_string: '/values/' + range_a1_notation,
        method: 'GET',
        auth_token: auth_token,
        body: JSON.stringify(jsonBody)
    }

    api_request(opts, function(err, result, data) {
        if (!err && result.statusCode > 299) {
            err = data.error.message;
        }
        return callback(err, data);
    });


}

/**
 * Takes a positive integer and returns the corresponding column name.
 * @param {number} num  The positive integer to convert to a column name.
 * @return {string}  The column name.
 */
function toA1ColumnName(num) {
    for (var ret = '', a = 1, b = 26;
        (num -= a) >= 0; a = b, b *= 26) {
        ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
    }
    return ret;
}
/*
    A1 notation

    Some API methods require a range in A1 notation. This is a string like Sheet1!A1:B2, that refers to a group of cells in the spreadsheet, and is typically used in formulas. For example, valid ranges are:

    Sheet1!A1:B2 refers to the first two cells in the top two rows of Sheet1.
    Sheet1!A:A refers to all the cells in the first column of Sheet1.
    Sheet1!1:2 refers to the all the cells in the first two rows of Sheet1.
    Sheet1!A5:A refers to all the cells of the first column of Sheet 1, from row 5 onward.
    A1:B2 refers to the first two cells in the top two rows of the first visible sheet.
    Sheet1 refers to all the cells in Sheet1.
*/

/**
 * Internal method to make all the callouts to the Google Sheet API.
 * @author  Doug Jodrell, Traction on Demand
 * @date  2016-08-15
 */
function api_request(opts, callback) {
    try {
        if (LOG_DEBUG_VERBOSE) console.log('api_request - opts: ' + JSON.stringify(opts));
    } catch (exception) {
        if (LOG_ERROR) console.log('api_request exception: ' + exception);
    }

    request({
        url: API_URL + opts.spreadsheet_id + opts.query_string,
        method: (opts.method) ? opts.method : 'GET',
        headers: {
            "Authorization": "Bearer " + opts.auth_token
        },
        body: (opts.body && opts.method && opts.method != 'GET') ? opts.body : null
    }, function(err, result, body) {

        if (err) {
            if (LOG_ERROR) console.log('api_request - api_request error: ' + err);
        } else {
            if (LOG_DEBUG) console.log('api_request response code: ' + result.statusCode);
            if (LOG_DEBUG_VERBOSE) console.log('api_request response body: ' + body);
        }

        try {
            body = JSON.parse(body);
        } catch (exception) {
            if (LOG_ERROR) console.log('api_request - cannot parse body: ' + exception);
        }
        return callback(err, result, body);
    });
}