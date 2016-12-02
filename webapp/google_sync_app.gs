/**
 * google web app
 * @description : google web app to create a trigger in Google sheets
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 ****************************************
 * @author      : Doug Jodrell, Traction on Demand
 * @date        : 2016-Dec-1
 * @description : Reconfigure to use Script Properties for Heroku App URL
 *                !!! DON'T FORGET TO ADD YOUR HEROKU URL TO THE SCRIPT PROPERTIES !!!
 */

function doGet(e) {
    var params = JSON.stringify(e);
    if (e.parameters.action != null && e.parameters.action == "remove_trigger" && e.parameters.docId != null) {
        deleteTrigger(e);
        return HtmlService.createHtmlOutput("done");
    } else if (e.parameters.action != null && e.parameters.action == "alignColumns" && e.parameters.docId != null) {
        alignColumns(e);
        return HtmlService.createHtmlOutput("done");
    } else if (e.parameters.action != null && e.parameters.action == "list_all_trigger") {
        var resultHtml = listAllTrigger();
        return HtmlService.createHtmlOutput("<ul>" + resultHtml + "</ul>");
    } else if (e.parameters.action != null && e.parameters.action == "remove_all_trigger") {
        deleteAllPreviousTrigger();
        return HtmlService.createHtmlOutput("done");
    } else if (e.parameters.docId != null) {
        initSheet(e);
        createTrigger(e);
        return HtmlService.createHtmlOutput("<script>document.location = 'https://docs.google.com/spreadsheets/d/" + e.parameters.docId + "/edit#gid=0&output=embed'</script>");
    } else {
        return HtmlService.createHtmlOutput("invalid arguments!");
    }
}



function createTrigger(e) {
    var triggers = ScriptApp.getProjectTriggers();

    var trigger_found = false;
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getTriggerSourceId() == e.parameters.docId) {
            trigger_found = true;
        }
    }
    //Logger.log('trigger_found=' + trigger_found);
    if (!trigger_found) {
        if (triggers.length == 20) {
            ScriptApp.deleteTrigger(triggers[0]);
        }

        ScriptApp.newTrigger('sync_trigger')
            .forSpreadsheet(e.parameters.docId)
            .onEdit()
            .create();
    }
}


function sync_trigger(e) {
    var herokuUrl = PropertiesService.getScriptProperties().getProperty('HEROKU_APP_URL');
    var activeSheet = SpreadsheetApp.getActiveSheet();

    var range = null;
    //Logger.log(activeSheet.getSheetName());
    if (activeSheet.getSheetName() == "DATA") {
        range = activeSheet.getActiveRange();
        Logger.log('numRows=' + range.getNumRows());
        if (range.getNumRows() <= 0) {
            range = e.range;
        }
    }

    //Logger.log(e);
    if (range != null) {
        var docId = SpreadsheetApp.getActiveSpreadsheet().getId();
        //Logger.log(docId);
        var numRows = range.getNumRows();
        var numCols = range.getNumColumns();
        //Logger.log('numRows=' + numRows);
        Logger.log('numCols=' + numCols);
		var cellRows =  new Array();
        for (var i = 1; i <= numRows; i++) {
            for (var j = 1; j <= numCols; j++) {

                var activeCell = range.getCell(i, j);

                var cellRow = activeCell.getRow();

                var idCellRange = activeSheet.getRange(cellRow, 1);
                var idCellRangeValues = idCellRange.getValues();
				if (idCellRangeValues[0][0] != '') {
					var cellCol = activeCell.getColumn();
					var statusColumn = getColumnNrByName(activeSheet, "sync_status") + 1;
					var batchIdColumn = statusColumn + 1; //getColumnNrByName(sheet, "sync_key") + 1;
					var messageColumn = batchIdColumn + 1; //getColumnNrByName(sheet, "sync_message") + 1;
					if (cellCol < statusColumn) {

						activeSheet.getRange(cellRow, statusColumn).setValue('Edit');
						activeSheet.getRange(cellRow, batchIdColumn).setValue('');
						activeSheet.getRange(cellRow, messageColumn).setValue('');
						cellRows.push(cellRow);

						if (cellRows.length == 10) {
							var rowParamenter2 =  cellRows.join(",") ;
							 var response2 = UrlFetchApp.fetch(herokuUrl + "/google/trigger?row=" +rowParamenter2 + "&col=" + cellCol + "&docId=" + docId);
							cellRows =  new Array();
						}
					}
				}

            }
        }
		if (cellRows.length > 0) {
			var rowParamenter =  cellRows.join(",") ;
			Logger.log('rowParamenter=' + rowParamenter);
			var response = UrlFetchApp.fetch(herokuUrl + "/google/trigger?row=" + rowParamenter + "&col=" + cellCol + "&docId=" + docId);
		}
    }
}




function initSheet(e) {
    // The code below opens a spreadsheet using it's ID and gets the name for it.
    // Note that the spreadsheet is NOT physically opened on the client side.
    // It is opened on the server only (for modification by the script).
    var spreadsheet = SpreadsheetApp.openById(e.parameters.docId);
    var sheet = spreadsheet.getSheets()[0];
    sheet.setFrozenRows(1);
    var lastColumn = sheet.getLastColumn();
    var headerRange = sheet.getRange(1, 1, 1, lastColumn);
}




function alignColumns(e) {
    var spreadsheet = SpreadsheetApp.openById(e.parameters.docId);
    var sheet = spreadsheet.getSheets()[0];

    var lastColumn = sheet.getLastColumn();
    for (var i = 1; i < lastColumn; i++) {
        sheet.autoResizeColumn(i);
    }
}


function deleteAllPreviousTrigger() {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
    }
}


function listAllTrigger() {
    var r = "";
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        r += "<li>" + triggers[i].getTriggerSourceId() + "</li>";
    }
    return r;
}


function deleteTrigger(e) {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getTriggerSourceId() == e.parameters.docId) {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }
}

function getColumnNrByName(sheet, columnName) {
    var range = sheet.getRange(1, 1, 1, sheet.getMaxColumns());
    var values = range.getValues();

    for (var row in values) {
        for (var col in values[row]) {
            //Logger.log("row " + row + " col " + col + " " + values[row][col]);
            if (values[row][col] == columnName) {
                return parseInt(col);
            }
        }
    }
    throw 'failed to get column by name';
}