/**
 * pg_setup.js
 * @description : Initialize the database for the SF <==> Google proxy.
 * @author Doug Jodrell, Traction on Demand
 * @date Aug 9, 2016
 */
// native modules
var pg = require("pg");

// custom modules
var pg_utils = require('pg/pg_utils');
const con = require('const/const');

/**
 * @description : Reset and initialize the database tables.
 * @author Doug Jodrell, Traction on Demand
 * @date 2016-Jul-25
 */
this.create_tables = function(req, res) {

    // drop existing tables.
    var sql = 'DROP TABLE IF EXISTS '+con.TBL_NAME_SEC+' CASCADE; ' +
              'DROP TABLE IF EXISTS '+con.TBL_NAME_REQ+' CASCADE; ';

    // recreate the security table.
    sql += 'CREATE TABLE '+con.TBL_NAME_SEC+' (' +
            'sf_user_id VARCHAR(18) PRIMARY KEY, ' +
            'sf_org_id VARCHAR(18) NOT NULL, ' +
            'sf_org_url VARCHAR NOT NULL, ' +
            'sf_access_token VARCHAR, ' +
            'sf_refresh_token VARCHAR, ' +
            'google_access_token VARCHAR, ' +
            'google_refresh_token VARCHAR, ' +
            'google_token_type VARCHAR, ' +
            'google_token_expire_date BIGINT, ' +
            'created_date TIMESTAMP NOT NULL DEFAULT NOW()); ';

    // recreate the request table.
    sql += 'CREATE TABLE '+con.TBL_NAME_REQ+' (' +
            'sf_req_id SERIAL PRIMARY KEY, ' +
            'sf_user_id VARCHAR(18) NOT NULL REFERENCES '+con.TBL_NAME_SEC+' (sf_user_id) ON DELETE CASCADE, ' +
            'sf_object_id VARCHAR(18), ' +
            'sf_object_name VARCHAR(100), ' +
            'sf_object_type VARCHAR(50), ' +
            'google_document_id VARCHAR(150), ' +
            'google_document_type VARCHAR(100), ' +
            'created_date TIMESTAMP NOT NULL DEFAULT NOW()); ';

    // create request table user ID index
    sql += 'CREATE INDEX ON '+con.TBL_NAME_REQ+'(sf_user_id); ';

    // create request table document ID index
    sql += 'CREATE INDEX ON '+con.TBL_NAME_REQ+'(google_document_id); ';

    // create request table object ID index
    sql += 'CREATE INDEX ON '+con.TBL_NAME_REQ+'(sf_object_id); ';


    // run the ugly giant query.
    pg_utils.do_query(sql, null, null);

    // return a false sense of security.
    res.send("Database Setup Complete.");
}

