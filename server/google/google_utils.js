/**
 * google_utils.js
 * @description : Google global utilities
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */

var express = require('express');
var rest = require('restler');

var apiVersion = "v3";

// default to production webapp
const google_web_app_url = process.env.GOOGLE_WEBAPP_URL;

// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;

/*
function loadDocument(currentToken, docId) {

    var auth_id = {
        type: token_type,
        value: access_token
    };

    return new GoogleSpreadsheet(docId, auth_id);
}
*/

function getDocUrl(docId) {
    return 'https://docs.google.com/spreadsheets/d/' + docId + '/edit#gid=0';
}

this.getMacroUrl = function(docId) {
    return google_web_app_url + "?docId="+docId;
}

function getWatchCallbackUrl(docId) {
    return "https://www.googleapis.com/drive/" + apiVersion + "/files/" + docId + "/watch";
}

function getObjectValue(l, index, propertyName) {
    var v = null;
    if (l != undefined && l != null) {
        if (l[index] != undefined && l[index] != null) {
            if (l[index][propertyName] != undefined && l[index][propertyName] != null) {
                v = l[index][propertyName];
            }
        }
    }
    return v;
}

function getId(req) {
    var currentId = "";
    for (var i = 0; i < req.sf_sync.sobject_metadata_list.length; i++) {
        var m = req.sf_sync.sobject_metadata_list[i];
        if (m.sfdc_api_name != undefined &&
            req.sf_sync.sobject != undefined &&
            m.sfdc_api_name == "Id") {
            currentId = req.sf_sync.sobject[m.col];
            break;
        }
    }
    return currentId;
}


function getIdOnArray(req, arr) {
    var currentId = "";
    for (var i = 0; i < req.sf_sync.sobject_metadata_list.length; i++) {
        var m = req.sf_sync.sobject_metadata_list[i];
        if (m.sfdc_api_name != undefined &&
            arr != undefined &&
            m.sfdc_api_name == "Id") {
            currentId = arr[m.col];
            break;
        }
    }
    return currentId;
}



exports.getId = getId;
exports.getIdOnArray = getIdOnArray;

exports.google_web_app_url = google_web_app_url;
exports.getObjectValue = getObjectValue;
exports.apiVersion = apiVersion;
exports.getDocUrl = getDocUrl;
exports.getWatchCallbackUrl = getWatchCallbackUrl;