/**
 * google_utils.js
 * @description : Google global utilities
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */

var express = require('express');

// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;





function DocumentsInfoClass() {
    this.Documents = new Array();
    this.InUse = false;

    this.initDocument = function(docId) {
        var d = {
            Id: docId,
            InitDate: new Date(),
            UpdatedDate: new Date(),
            InUse: false
        };

        this.Documents.push(d);
        return d;
    }

    this.getDocument = function(docId) {
        var d = null;
        if (this.Documents.length > 0) {
            for (var i = 0; i < this.Documents.length; i++) {
                if (this.Documents[i].Id == docId) {
                    d = this.Documents[i];
                    break;
                }
            }
        }
        if (d == null) {
            d = this.initDocument(docId);
        }
        return d;
    }


    this.listDocument = function(docId) {
        if (this.Documents.length > 0) {
            for (var i = 0; i < this.Documents.length; i++) {
                if (LOG_DEBUG_VERBOSE) console.log("DocumentsInfoClass Doc" + this.Documents[i].Id + " InUse: " + this.Documents[i].InUse + " InitDate: " + this.Documents[i].InitDate);
            }
        }
    }
}


var documentsInfo = new DocumentsInfoClass();

var sheculerCounter = 0;
var intervalPeriod = 30; //seconds

var intervalObject = setInterval(function() {
    sheculerCounter++;
    if (LOG_DEBUG_VERBOSE) console.log(sheculerCounter, '>>>> ' + intervalPeriod + ' seconds passed SCHEDULER');
    documentsInfo.listDocument();
    documentsInfo = new DocumentsInfoClass();
}, 1000 * intervalPeriod);

exports.documentsInfo = documentsInfo;