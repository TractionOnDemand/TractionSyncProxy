var express = require('express');
var request = require('request');

// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;
/**
 * Get the DATA for the specified List ID.
 * TODO: Dynamically get the sObject type (currently hard coded to Opportunity).
 * @param  req HTTP request
 * @param  res HTTP response
 * @param  callback function pointer for 'next' operation.
 * @author Doug Jodrell, Traction on Demand
 * @date   2016-07-25
 */
function get_list_data(req, res, callback) {
    if (LOG_TRACE) console.log('get_list_data ENTER');
    var list_path = req.sf_sync.sf_org_url + '/services/data/v37.0/sobjects/Opportunity/listviews/' + req.sf_sync.sf_object_id + '/results?limit=2000';
    if (LOG_DEBUG) console.log('Session ID: ' + req.sf_sync.sf_access_token);
    if (LOG_DEBUG) console.log('Path: ' + list_path);

    request({
        headers: {
            'Authorization': 'Bearer ' + req.sf_sync.sf_access_token
        },
        uri: list_path,
        gzip: true
    }, function(err, response, body) {

        if (err) {
            if (LOG_ERROR) console.log('get_list_data ERROR');
            callback(err, req, res);
        } else if (response.statusCode == "401") {
            var err_msg = "401 UNAUTHORIZED: The request has not been applied because it lacks valid authentication credentials for Salesforce.";
            callback(err_msg, req, res);
        } else {
            if (LOG_TRACE) console.log('get_list_data SUCCESS');
            if (LOG_DEBUG) console.log('get list data status: ' + response.statusCode);
            req.sf_sync.list_data = format_list_data(body);
            if (LOG_DEBUG) console.log('get_list_data req.sf_sync.list_data.rows.length: ' + req.sf_sync.list_data.rows.length);
            var columns = [];
            for (var y = 0; y < req.sf_sync.list_data.columns.names.length; y++) {
                var c = {
                    Name: req.sf_sync.list_data.columns.names[y],
                    Position: y,
                    Metadata: {}
                };

                for (var i = 0; i < req.sf_sync.list_meta.length; i++) {
                    var f = req.sf_sync.list_meta[i];
                    if (c.Name == f.name) {
                        c.Metadata = f;
                        break;
                    }
                }
                columns.push(c);
            }
            req.sf_sync["columns"] = columns;

            callback(null, req, res);
        }


    });
    if (LOG_TRACE) console.log('get_list_data EXIT');
}

/**
 * Get the META DATA for the specified list ID. This includes list name and picklist values.
 * TODO: Dynamically get the sObject type (currently hard coded to Opportunity).
 * @param  req HTTP request
 * @param  res HTTP response
 * @param  callback function pointer for 'next' operation.
 * @author Doug Jodrell, Traction on Demand
 * @date   2016-08-01
 */
function get_list_meta(req, res, callback) {
    if (LOG_TRACE) console.log('get_list_meta ENTER');
    var describePath = req.sf_sync.sf_org_url + '/services/data/v37.0/sobjects/Opportunity/describe';
    if (LOG_DEBUG) console.log('Path: ' + describePath);
    request({
        headers: {
            'Authorization': 'Bearer ' + req.sf_sync.sf_access_token
        },
        uri: describePath,
        gzip: true
    }, function(err, response, body) {
        if (err) {
            if (LOG_ERROR) console.log('get_list_meta ERROR: ' + err);
            callback(err, req, res);
        } else if (response.statusCode == "401") {
            var err_msg = "401 UNAUTHORIZED: The request has not been applied because it lacks valid authentication credentials for Salesforce.";
            callback(err_msg, req, res);
        } else {
            if (LOG_TRACE) console.log('get_list_meta SUCCESS');
            //if (LOG_DEBUG) console.log('get_list_meta data: '+body)
            req.sf_sync.list_meta = format_meta_data(body);
            callback(null, req, res);
        }


    });
    if (LOG_TRACE) console.log('get_list_meta EXIT');
}

/**
 * @description format the raw listview data.
 * @param rawListData - raw data returned from SalesForce during list/report export.
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
function format_list_data(rawListData) {

    if (LOG_TRACE) console.log('format_list_data ENTER');

    var metadataResult = {}; //sample.sample_metadata;//{};

    try {

        var parseListData = JSON.parse(rawListData);

        if (LOG_DEBUG) console.log('handleMetadataResult: ' + parseListData.columns);
        //console.log('CloseDate: '+parseListData.records[0].columns[3].value);

        var col_names = new Array;
        var col_type = new Array;
        var col_picklist = new Array;
        col_names.push("Id");
        col_type.push("id");
        col_picklist = new Array;

        for (i = 0; i < parseListData.columns.length; i++) {
            if (col_names.indexOf(parseListData.columns[i].fieldNameOrPath) == -1) {
                col_names.push(parseListData.columns[i].fieldNameOrPath);
                col_type.push(parseListData.columns[i].type);
                col_picklist = new Array;
            }
        }
        metadataResult["columns"] = {
            names: col_names,
            type: col_type,
            picklist: col_picklist
        };

        metadataResult["rows"] = new Array;
        if (LOG_DEBUG_VERBOSE) console.log('handleMetadataResult: metadataResult.rows.length:' + metadataResult.rows.length);
        if (LOG_DEBUG_VERBOSE) console.log('handleMetadataResult: parseListData.records.length:' + parseListData.records.length);
        for (x = 0; x < parseListData.records.length; x++) {
            var r = {};
            for (y = 0; y < parseListData.records[x].columns.length; y++) {
                var c = parseListData.records[x].columns[y];
                r[c.fieldNameOrPath] = c.value;
            }
            metadataResult["rows"].push(r);
        }
        metadataResult["columns"].names.push("sync_status");
        metadataResult["columns"].type.push("SYSTEM");
        metadataResult["columns"].names.push("sync_key");
        metadataResult["columns"].type.push("SYSTEM");
        metadataResult["columns"].names.push("sync_message");
        metadataResult["columns"].type.push("SYSTEM");

        metadataResult["label"] = parseListData.label;
        metadataResult["id"] = parseListData.id;
        metadataResult["developerName"] = parseListData.developerName;

    } catch (exception) {
        if (LOG_ERROR) console.log('format_list_data Exception: ' + exception);
    }


    if (LOG_TRACE) console.log('format_list_data ENTER');
    return metadataResult;
}

/**
 * @description format the raw listview data.
 * @param rawMetaData - raw object describe meta data returned from SalesForce.
 * @author Doug Jodrell, Traction on Demand
 * @date 07/01/2016
 */
function format_meta_data(rawMetaData) {
    var formattedMetaData = [];
    try {
        jsonData = JSON.parse(rawMetaData);

        // get field names and picklist values
        for (var key in jsonData.fields) {
            row = jsonData.fields[key];
            field = {};
            field.name = row['name'];
            field.type = row['type'];
            field.label = row['label'];
            field.updateable = row['updateable'];
            field.picklist = [];
            for (var pickItem in row['picklistValues']) {
                field.picklist.push(row['picklistValues'][pickItem]['value']);
                if (LOG_DEBUG_VERBOSE) console.log('    picklist item:' + row['picklistValues'][pickItem]['value']);
            }
            formattedMetaData.push(field);
            if (LOG_DEBUG_VERBOSE) console.log('format_meta_data - field: '+JSON.stringify(field));
        }

    } catch (exception) {
        if (LOG_ERROR) console.log('format_meta_data Exception: ' + exception);
    }

    if (LOG_DEBUG_VERBOSE) console.log('format_meta_data: ' + JSON.stringify(formattedMetaData));
    return formattedMetaData;
}

exports.get_list_data = get_list_data;
exports.get_list_meta = get_list_meta;