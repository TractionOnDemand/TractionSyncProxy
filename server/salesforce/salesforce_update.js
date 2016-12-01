var express = require('express');
var request = require('request');
var google_utils = require('google/google_utils');


// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false
const LOG_DEBUG = false;
const LOG_TRACE = false;



this.update_sobject = function(req, res, callback) {
    if (req.sf_sync.google_rows != undefined) {
        this.update_sobject_multiple(req, res, callback);
    } else {
        this.update_sobject_single(req, res, callback);
    }
}


function BatchRequestClass() {
    this.KEY = 0;
    this.SENT = false;
    this.ERROR = false;
    this.SUCCESS = false;
    this.DONE = false;
    this.MESSAGE = "";
    this.REQUESTS = new Array();
    this.RESULT = new Array();
}

this.update_sobject_multiple = function(req, res, callback) {

    if (LOG_TRACE) console.log('update_sobject_multiple ENTER');

    //var requestBody = { batchRequests: [] };
    //var batchSizeCounter =0;
    req["sfdc_next_batch"] = 0;
    req["sfdc_batch"] = [];
    //var batchRequestList = [];
    var batchChunk = new BatchRequestClass();

    for (var x = 0; x < req.sf_sync.google_rows.length; x++) {
        var currentRow = req.sf_sync.google_rows[x];

        var sfdc_object;
        var sfdc_object_string;
        try {
            sfdc_object = format_sobject(req, currentRow);

            var currentId = google_utils.getIdOnArray(req, currentRow);

            var batchRequest = {
                "method": "PATCH",
                "url": "v37.0/sobjects/Opportunity/" + currentId,
                "richInput": sfdc_object
            };

            batchChunk.REQUESTS.push(batchRequest);
            if ((batchChunk.REQUESTS.length % 25) == 0) {
                req.sfdc_batch.push(batchChunk);
                batchChunk = new BatchRequestClass();
            }

            //requestBody.batchREQUESTS.push(batchRequest);

        } catch (exception) {
            return callback(exception, req, res);
        }

    }

    if (batchChunk.REQUESTS.length > 0) {
        if (LOG_DEBUG_VERBOSE) console.log('loop_sfdc_update batchChunk.REQUESTS.length=' + batchChunk.REQUESTS.length);
        req.sfdc_batch.push(batchChunk);
    }


    loop_sfdc_update(req, res, callback);

    if (LOG_TRACE) console.log('update_sobject EXIT');
}


function loop_sfdc_update(req, res, callback) {
    if (LOG_TRACE) console.log('loop_sfdc_update ENTER');

    if (req.sfdc_next_batch >= req.sfdc_batch.length) {
        callback(null, req, res);
    } else {
        req.sfdc_batch[req.sfdc_next_batch].SENT = true;

        var requestBody = { batchRequests: [] };
        requestBody.batchRequests = req.sfdc_batch[req.sfdc_next_batch].REQUESTS;

        var url = req.sf_sync.sf_org_url + '/services/data/v37.0/composite/batch/';

        var headers = {
            'Accept': 'application/json;charset=UTF-8',
            'Authorization': 'Bearer ' + req.sf_sync.sf_access_token,
            'content-type': 'application/json'
        };

        var opts = {
            'uri': url,
            'headers': headers,
            'method': 'POST',
            'body': JSON.stringify(requestBody)
        };

        //https://github.com/kevinohara80/nforce/blob/master/index.js
        request(opts, function(err, response, body) {

            // error sending the request to SFDC
            if (err) {

                req.sfdc_batch[req.sfdc_next_batch].ERROR = true;
                req.sfdc_batch[req.sfdc_next_batch].MESSAGE = err;
            } else if (response && response.statusCode > 299) {
                var message = 'Unknown Error';
                try {
                    body = JSON.parse(body);
                    message = body[0].message;
                } catch (exception) {
                    message += ' - cannot parse message: ' + exception;
                }
                if (LOG_DEBUG) console.log('update_sobject callback response error: ' + message);

                req.sfdc_batch[req.sfdc_next_batch].MESSAGE = message;
                req.sfdc_batch[req.sfdc_next_batch].ERROR = true;
            } else {
                req.sfdc_batch[req.sfdc_next_batch].SUCCESS = true;
                req.sfdc_batch[req.sfdc_next_batch].RESULT = JSON.parse(body);
            }

            req.sfdc_batch[req.sfdc_next_batch].DONE = true;
            req.sfdc_batch[req.sfdc_next_batch].KEY = req.sfdc_next_batch;

            req.sfdc_next_batch++;
            loop_sfdc_update(req, res, callback);

            // nothing but blue skies ahead.
            if (LOG_TRACE) console.log('loop_sfdc_update callback SUCCESS');


        });
    }

}


this.update_sobject_single = function(req, res, callback) {

    if (LOG_TRACE) console.log('update_sobject ENTER');
    var sobject = req.sf_sync.sobject;
    var sfdc_object;
    var sfdc_object_string;
    try {
        sfdc_object = format_sobject(req, req.sf_sync.sobject);
        sfdc_object_string = JSON.stringify(sfdc_object);
    } catch (exception) {
        return callback(exception, req, res);
    }



    var currentId = google_utils.getId(req);
    //var url = 'https://listviewsync-dev-ed.my.salesforce.com/services/data/v37.0/sobjects/Opportunity/'+sobject.id;
    //var url = 'https://traction-dev-ed.my.salesforce.com/services/data/v37.0/sobjects/Opportunity/'+sobject.id;
    //var url = 'https://visbaldeveloper-dev-ed.my.salesforce.com/services/data/v37.0/sobjects/Opportunity/' + sobject.id;
    var url = req.sf_sync.sf_org_url + '/services/data/v37.0/sobjects/Opportunity/' + currentId;
    if (LOG_DEBUG_VERBOSE) console.log('update_sobject ulr: ' + url);
    if (LOG_DEBUG) console.log('update_sobject sfdc_object_string: ' + sfdc_object_string);

    var headers = {
        'Accept': 'application/json;charset=UTF-8',
        'Authorization': 'Bearer ' + req.sf_sync.sf_access_token,
        'content-type': 'application/json'
    };
    var opts = {
        'uri': url,
        'method': 'PATCH',
        'headers': headers,
        'body': sfdc_object_string
    };

    //https://github.com/kevinohara80/nforce/blob/master/index.js
    request(opts, function(err, response, body) {

        // error sending the request to SFDC
        if (err) {
            if (LOG_ERROR) console.log('update_sobject callback ERROR: ' + err);
            return callback(err, req, res);
        }
        if (response && response.statusCode > 299) {
            var message = 'Unknown Error';
            try {
                body = JSON.parse(body);
                message = body[0].message;
            } catch (exception) {
                message += ' - cannot parse message: ' + exception;
            }
            if (LOG_DEBUG) console.log('update_sobject callback response error: ' + message);
            return callback(message, req, res);
        }

        // nothing but blue skies ahead.
        if (LOG_TRACE) console.log('update_sobject callback SUCCESS');
        callback(null, req, res);

    });


    if (LOG_TRACE) console.log('update_sobject EXIT');
}



function format_sobject(req, currentArray) {

    if (LOG_DEBUG) console.log("format_sobject metadataList.length :" + req.sf_sync.sobject_metadata_list.length);
    //console.log(req.sf_sync.sobject);
    if (currentArray != undefined) {
        var sobject = {};
        for (var i = 0; i < req.sf_sync.sobject_metadata_list.length; i++) {
            var m = req.sf_sync.sobject_metadata_list[i];
            //console.log(m);
            //if (m.sfdc_api_name != undefined && m.sfdc_api_name == "Id") {
            //    sobject[m.sfdc_api_name] = req.sf_sync.sobject[m.col];
            //} else
            if (m.sfdc_updatable != undefined && m.sfdc_updatable.toLowerCase() == 'true') {
                var currentValue = null;
                if (m.sfdc_type == 'date') {
                    currentValue = new Date(currentArray[m.col]).toISOString();
                } else if (m.sfdc_type == 'datetime') {
                    currentValue = new Date([m.col]).toISOString();
                } else if (m.sfdc_type == "number" || m.sfdc_type == "currency" || m.sfdc_type == "percent" || m.sfdc_type == "double") {
                    //currentValue = currentArray[m.col];
                    //currentValue = Number(currentArray[m.col].replace(/[^0-9\.]+/g,""));
                    currentValue = currentArray[m.col].replace(/[^\d.-]/g, '');
                } else {
                    currentValue = currentArray[m.col];
                }
                sobject[m.sfdc_api_name] = currentValue;
            }
        }
    } else {
        if (LOG_DEBUG_VERBOSE) console.log("INVALID ROW DATA sobject");
    }

    if (LOG_DEBUG_VERBOSE) console.log(sobject);
    return sobject;

}