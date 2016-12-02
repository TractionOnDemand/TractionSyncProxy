const HEROKU_URL = process.env.HEROKU_URL;


// Table names
//const DB_SCHEMA_NAME = 'public';
const TBL_NAME_ORG = 'salesforce_org';
const TBL_NAME_SEC = 'user_security';
const TBL_NAME_REQ = 'user_request';

// Google => SFDC Sync Status
const SYNC_STATUS_EDIT = 'Edit';
const SYNC_STATUS_PENDING = 'Pending';
const SYNC_STATUS_ERROR = 'Error';
const SYNC_STATUS_SUCCESS = 'Synced';

const SHEET_METADATA_NAME = 'METADATA';
const SHEET_DATA_NAME = 'DATA';

exports.TBL_NAME_ORG = TBL_NAME_ORG;
exports.TBL_NAME_SEC = TBL_NAME_SEC;
exports.TBL_NAME_REQ = TBL_NAME_REQ;

exports.SYNC_STATUS_EDIT = SYNC_STATUS_EDIT;
exports.SYNC_STATUS_PENDING = SYNC_STATUS_PENDING;
exports.SYNC_STATUS_ERROR = SYNC_STATUS_ERROR;
exports.SYNC_STATUS_SUCCESS = SYNC_STATUS_SUCCESS;

exports.SHEET_METADATA_NAME = SHEET_METADATA_NAME;
exports.SHEET_DATA_NAME = SHEET_DATA_NAME;