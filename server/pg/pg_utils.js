/**
 * pg_utils.js
 * @description : Postgress utility to handle all database calls
 * @authors Ricardo Visbal & Doug Jodrell, Traction on Demand
 * @date 2016-Jul-25
 */
var pg = require("pg");

// custom modules
const con = require('const/const');

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/traction_sf_sync";

// enable/disable detailed logging.
const LOG_ERROR = true;
const LOG_DEBUG_VERBOSE = false;
const LOG_DEBUG = false;
const LOG_TRACE = false;




/******************************************************************************
 *      CRUD - CREATE
 ******************/
this.add_sf_org = function(req, res, callback) {
    if (LOG_TRACE) console.log('add_sf_org ENTER');
    if (LOG_DEBUG) {
        console.log('org id: ' + req.body.org_id);
        console.log('org_url: ' + req.body.org_url);
        console.log('org_key: ' + req.body.org_key);
        console.log('org_secret: ' + req.body.org_secret);
    }

    // build the query to upsert the new org information.
    var params = [req.body.org_id, req.body.org_url, req.body.org_key, req.body.org_secret];
    var sql = 'INSERT INTO ' + con.TBL_NAME_ORG +
        '(sf_org_id, sf_org_url, sf_org_key, sf_org_secret )' +
        'VALUES ($1, $2, $3, $4) ' +
        'ON CONFLICT (sf_org_id) ' +
        'DO UPDATE SET (sf_org_url, sf_org_key, sf_org_secret) = ($2, $3, $4) ' +
        'WHERE EXCLUDED.sf_org_id = $1;';

    // run the query and send any errors back to the callback.
    do_query(sql, params, function(err, response) {
        if (err) {
            if (LOG_ERROR) console.log('add_sf_org sql '+err);
            return callback(err, req, res);
        }
        req.sf_sync.sf_org_id = req.body.org_id;
        return callback(null, req, res);
    });
}

/**
 * Add the salesforce user ID to the security table if it does not already exist.
 * @author Doug Jodrell, Traction on Demand
 * @date July 29, 2016
 */
this.add_user_security = function(req, res, callback) {
    if (LOG_TRACE) console.log("add_user_security ENTER");
    if (LOG_DEBUG) console.log("add_user_security: sf_user_id=" + req.query.userId);
    if (LOG_DEBUG) console.log("add_user_security: sf_org_id=" + req.query.orgId);
    if (LOG_DEBUG) console.log("add_user_security: sf_org_url=" + req.query.orgUrl);

    // build the query to insert the user ID if it does not already exist.
    var sql = 'INSERT INTO ' + con.TBL_NAME_SEC +
        '(sf_user_id, sf_org_id, sf_org_url) ' +
        'VALUES ($1, $2, $3) ' +
        'ON CONFLICT DO NOTHING';

    // run the query and pass any errors back to our callback
    do_query(sql, [req.query.userId, req.query.orgId, req.query.orgUrl], function(err, result) {
        req.sf_sync.sf_user_id = req.query.userId;
        return callback(err, req, res);
    });
}



/**
 * Add the export request data to the database if it does not already exist
 * @author Doug Jodrell, Traction on Demand
 * @date July 29, 2016
 */
this.add_user_request = function(req, res, callback) {
    if (LOG_TRACE) console.log("add_user_request ENTER");
    if (LOG_DEBUG) {
        console.log('add_user_request - sf_user_id='+req.query.userId);
        console.log('add_user_request - sf_object_id='+req.query.listId);
        console.log('add_user_request - sf_object_type='+req.query.sObjectType);
    }

    // build the query to insert the request data if it does not already exist.
    // This is a PostgreSQL UPSERT which returns the ID of the request.
    // TODO: look into ON CONFLICT DO UPDATE for upsert (as of pgSQL v9.5).
    var sql = "WITH sel AS (" +
        "SELECT sf_req_id, sf_user_id, sf_object_id, sf_object_type " +
        "FROM user_request " +
        "WHERE sf_user_id = $1 AND sf_object_id = $2 " +
        "), ins AS (" +
        "INSERT INTO user_request(sf_user_id, sf_object_id, sf_object_type) " +
        "SELECT $1, $2, $3 " +
        "WHERE NOT EXISTS (SELECT 1 FROM sel) " +
        "RETURNING sf_req_id, sf_user_id, sf_object_id, sf_object_type) " +
        "SELECT sf_req_id, sf_user_id, sf_object_id, sf_object_type " +
        "FROM ins UNION ALL SELECT sf_req_id, sf_user_id, sf_object_id, sf_object_type FROM sel";

    // run the query and pass any errors back to our callback
    do_query(sql, [req.query.userId, req.query.listId, req.query.sObjectType], function(err, result) {
        if (err) {
            if (LOG_ERROR) console.log('add_user_request - sql error: '+err)
            return callback(err, req, res);
        }
        if (LOG_TRACE) console.log('add_user_request: SUCCESS');
        req.sf_sync.sf_req_id = result.rows[0].sf_req_id;
        if (LOG_DEBUG) console.log('add_user_request sf_req_id: '+req.sf_sync.sf_req_id);
        return callback(null, req, res);
    });
}




/******************************************************************************
 *      CRUD - READ
 ******************/

/**
 * @description Get the Google Sheet ID for a specific user/list.
 * @author Doug Jodrell, Traction on Demand
 * @date Aug 11, 2016
 */
this.get_sheet_id = function(req, res, callback) {
    if (LOG_TRACE) console.log('get_sheet_url ENTER');
    if (LOG_DEBUG) console.log('get_sheet_url user_id: '+req.sf_sync.sf_user_id +' list_id: '+ req.sf_sync.sf_list_id);

    sql = 'SELECT google_document_id FROM ' + con.TBL_NAME_REQ +
        ' WHERE sf_user_id = $1 AND sf_object_id = $2;';
    do_query(sql, [req.sf_sync.sf_user_id, req.sf_sync.sf_list_id], function(err, result) {
        if (err) {
            if (LOG_ERROR) console.log('get_sheet_url sql: '+err);
            return callback(err, req, res);
        }
        var sheet_id = null;
        if (result.rows.length > 0) {
            sheet_id = result.rows[0].google_document_id;
            if (LOG_DEBUG) console.log('get_sheet_id doc_id: '+sheet_id);
        }
        return callback(null, sheet_id);
    });
}


/**
 * @description Get the SF and Google auth tokens based on the request id.
 * @author Doug Jodrell, Traction on Demand
 * @date July 29, 2016
 */
this.get_tokens_by_request = function(req, res, callback) {
    if (LOG_TRACE) console.log('get_tokens_by_request ENTER');

    var sql = 'SELECT req.sf_req_id, req.sf_object_id, req.google_document_id, ' +
              'sec.sf_user_id, sec.sf_org_id, sec.sf_org_url, ' +
              'sec.sf_access_token, sec.sf_refresh_token, ' +
              'sec.google_access_token, sec.google_refresh_token, sec.google_token_type, sec.google_token_expire_date ' +
              'FROM user_request req ' +
              'JOIN user_security sec ON req.sf_user_id = sec.sf_user_id ' +
              'WHERE req.sf_req_id = $1;';

    if (LOG_DEBUG_VERBOSE) console.log('get_tokens_by_request - sql: ' +sql);
    do_query(sql, [req.sf_sync.sf_req_id], function(err, result) {
        if (err) {
            if (LOG_ERROR) console.log('get_tokens_by_request error: '+err);
            return callback(err, req, res);
        }

        if (LOG_DEBUG) {
            console.log('get_tokens_by_request user ID: ' + result.rows[0].sf_user_id);
            console.log('get_tokens_by_request org ID: ' + result.rows[0].sf_org_id);
            console.log('get_tokens_by_request org_url: ' + result.rows[0].sf_org_url);
            console.log('get_tokens_by_request sf_access_token: ' + result.rows[0].sf_access_token);
            console.log('get_tokens_by_request object_id: ' + result.rows[0].sf_object_id);
            console.log('get_tokens_by_request doc ID: ' + result.rows[0].google_document_id);
        }

        // get the data we need and send it to the callback.
        req.sf_sync.sf_user_id = result.rows[0].sf_user_id;
        req.sf_sync.sf_org_id = result.rows[0].sf_org_id;
        req.sf_sync.sf_org_url = result.rows[0].sf_org_url;
        req.sf_sync.sf_access_token = result.rows[0].sf_access_token;
        req.sf_sync.sf_refresh_token = result.rows[0].sf_refresh_token;
        req.sf_sync.sf_object_id = result.rows[0].sf_object_id;
        req.sf_sync.doc_id = result.rows[0].google_document_id;
        req.sf_sync.google_access_token = result.rows[0].google_access_token;
        req.sf_sync.google_refresh_token = result.rows[0].google_refresh_token;
        req.sf_sync.google_token_type = result.rows[0].google_token_type;
        req.sf_sync.google_token_expire_date = result.rows[0].google_token_expire_date;
        return callback(null, req, res);
    });
}

/**
 * @description Get the SF and Google auth tokens based on the document id.
 * @author Doug Jodrell, Traction on Demand
 * @date Aug 4, 2016
 */
this.get_tokens_by_document = function(req, res, callback) {
    if (LOG_TRACE) console.log('get_tokens_by_document ENTER');

    var sql = 'SELECT req.sf_req_id, req.sf_object_id, ' +
            'sec.sf_user_id, sec.sf_org_id, sec.sf_org_url, ' +
            'sec.sf_access_token, sec.sf_refresh_token, ' +
            'sec.google_access_token, sec.google_refresh_token, sec.google_token_type, sec.google_token_expire_date ' +
            'FROM user_request req ' +
            'JOIN user_security sec ON req.sf_user_id = sec.sf_user_id ' +
            'WHERE req.google_document_id = $1;';

    do_query(sql, [req.sf_sync.doc_id], function(err, result) {
        if (err) {
            if (LOG_ERROR) console.log('get_tokens_by_document error: '+err);
            return callback(err, req, res);
        }
        if (LOG_DEBUG) {
            console.log('get_tokens_by_document user ID: ' + result.rows[0].sf_user_id);
            console.log('get_tokens_by_document org ID: ' + result.rows[0].sf_org_id);
            console.log('get_tokens_by_document org_url: ' + result.rows[0].sf_org_url);
            console.log('get_tokens_by_document sf_access_token: ' + result.rows[0].sf_access_token);
            console.log('get_tokens_by_document object_id: ' + result.rows[0].sf_object_id);
            console.log('get_tokens_by_document g_access_token: ' + result.rows[0].google_access_token);
            console.log('get_tokens_by_document g_refresh_token: ' + result.rows[0].google_refresh_token);
        }

        // get the data we need and send it to the callback.
        req.sf_sync.sf_user_id = result.rows[0].sf_user_id;
        req.sf_sync.sf_org_id = result.rows[0].sf_org_id;
        req.sf_sync.sf_org_url = result.rows[0].sf_org_url;
        req.sf_sync.sf_access_token = result.rows[0].sf_access_token;
        req.sf_sync.sf_refresh_token = result.rows[0].sf_refresh_token;
        req.sf_sync.sf_object_id = result.rows[0].sf_object_id;
        req.sf_sync.google_access_token = result.rows[0].google_access_token;
        req.sf_sync.google_refresh_token = result.rows[0].google_refresh_token;
        req.sf_sync.google_token_type = result.rows[0].google_token_type;
        req.sf_sync.google_token_expire_date = result.rows[0].google_token_expire_date;
        return callback(null, req, res);

    });
}


/******************************************************************************
 *      CRUD - UPDATE
 ******************/

/**
 * @description Update the user request table with the document ID.
 * @author Doug Jodrell, Traction on Demand
 * @date July 29, 2016
 */
this.update_request_doc_id = function(req, res, callback) {
    if (LOG_TRACE) console.log("update_request_doc_id ENTER");
    if (LOG_DEBUG) {
        console.log('update_request_doc_id - doc_id=' +req.sf_sync.doc_id +' request_id='+req.sf_sync.sf_req_id);
    }

    // build the sql query.
    var sql = "UPDATE user_request " +
        "SET google_document_id=$2 " +
        "WHERE sf_req_id=$1";

    // run the query and let the callback handle any errors.
    do_query(sql, [req.sf_sync.sf_req_id, req.sf_sync.doc_id], function(err, result) {
        return callback(err, req, res);
    });
}

/**
 * @description Update the user security table with the salesforce oauth tokens and ord id
 * @author Doug Jodrell, Traction on Demand
 * @date July 29, 2016
 */
this.update_sf_user_security = function(req, res, callback) {
    if (LOG_TRACE) console.log('update_sf_user_security ENTER');
    if (LOG_DEBUG_VERBOSE) console.log('update_sf_user_security: sf_oauth.id =' +req.sf_sync.sf_oauth.id);

    // parse the user ID out of the oauth id url.
    var sf_oauth_id = req.sf_sync.sf_oauth.id;
    var lastIndex = sf_oauth_id.lastIndexOf("/")
    var sf_user_id = sf_oauth_id.substring(1 + lastIndex, sf_oauth_id.length);

    if (LOG_DEBUG) {
        console.log('update_sf_user_security: userId:'+sf_user_id);
        console.log('update_sf_user_security: auth:'+req.sf_sync.sf_oauth.access_token);
        console.log('update_sf_user_security: refresh:'+req.sf_sync.sf_oauth.refresh_token);
    }

    // parameters passed to the DB query.
    var params = [
        sf_user_id,
        req.sf_sync.sf_oauth.access_token,
        req.sf_sync.sf_oauth.refresh_token
    ];

    // build query to update Org ID and SF oauth tokens in the user security table.
    var sql = 'UPDATE ' + con.TBL_NAME_SEC + ' SET ' +
        "sf_access_token = $2, " +
        "sf_refresh_token = $3 " +
        "WHERE sf_user_id = $1";

    // run the query and let the callback handle any errors.
    do_query(sql, params, function(err, result) {
        return callback(err, req, res);
    });
}


/**
 * @description Update the org table with the google oauth tokens
 * @author Doug Jodrell, Traction on Demand
 * @date Aug 10, 2016
 */
this.update_google_user_security = function(req, res, callback) {
    if (LOG_TRACE) console.log('update_google_user_security ENTER');
    if (LOG_DEBUG) console.log('update_google_user_security request Id: '+req.sf_sync.sf_req_id);
    if (LOG_DEBUG) console.log('update_google_user_security token: '+JSON.stringify(req.sf_sync.google_oauth));

    var access_token = req.sf_sync.google_oauth.access_token;
    var refresh_token = req.sf_sync.google_oauth.refresh_token;
    var token_type = req.sf_sync.google_oauth.token_type;
    var expiry_date = req.sf_sync.google_oauth.expiry_date;

    var params = [req.sf_sync.sf_req_id, access_token, token_type, expiry_date];
    var sql = 'UPDATE ' + con.TBL_NAME_SEC +
        ' SET google_access_token = $2,' +
        ' google_token_type = $3, ' +
        ' google_token_expire_date = $4';
    if (refresh_token) {
        params.push(refresh_token);
        sql += ', google_refresh_token = $5';
    }
    sql += ' WHERE sf_user_id =' +
            ' (SELECT sf_user_id FROM ' + con.TBL_NAME_REQ + ' WHERE sf_req_id = $1);';

    do_query(sql, params, function(err, response) {
        callback(err, req, res);
    });
}







/******************************************************************************
 *      CRUD - DELETE
 ******************/


/******************************************************************************
 *      UTILITY FUNCTIONS
 ******************/


/**
 * Utility function to manage the database connection and run a query.
 * This should be wrapped by other functions to handle the actual result data.
 */
function do_query(sql, params, callback) {

    if (LOG_DEBUG_VERBOSE) console.log('do_query sql='+sql);
    // force a callback if none was provided
    if (!callback) {
        callback = logging_callback;
    }
    var client = new pg.Client(connectionString);
    client.connect();
    var query = client.query(sql, params, function(err, result) {
        return callback(err, result);
    });
    query.on("end", function() {
        if (LOG_TRACE) console.log('do_query END');
        client.end();
    })
}

/**
 * Callback stub for headless calls to do_query().
 */
function logging_callback(err, result) {
    if (err) {
        if (LOG_ERROR) console.log('logging_callback ERROR: '+err);
    } else {
        if (LOG_DEBUG) console.log('logging_callback SUCCESS');
    }
}

exports.do_query = do_query;
