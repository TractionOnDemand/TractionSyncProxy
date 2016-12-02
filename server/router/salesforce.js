/**
 * salesforce.js
 * @description : serves as all salesforce route calls
 * @author Ricardo Visbal and Doug Jodrell, Traction on Demand
 * @date 2016-Jul-25
 */
// native modules
var express = require('express');
var router = express.Router();

// custom modules
var sf_handler = require('salesforce/salesforce_handler');


/**
 * @description : Point of Entry, will store all the initial paramenter pass
 * @author , Traction on Demand
 * @date 2016-Jul-25
 */
router.get('/', sf_handler.export_list);


/**
 * @description : This is the listener to handle the oauth callback from salesfoce user
 * @author , Traction on Demand
 * @date 2016-Jul-25
 */
router.get('/oauth', sf_handler.sf_oauth_callback);


/**
 * @description : This is the listener to handle the oauth callback from salesfoce org
 * @author Doug Jodrell, Traction on Demand
 * @date 2016-Jul-25
 */
router.post('/org_setup', sf_handler.org_setup);


/**
 * @description : This is the listener to handle
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Aug-17
 */
router.post('/handler', sf_handler.page_handler);
router.post('/rows', sf_handler.rows);

/**
 *
 */
router.get('/get_sheet', sf_handler.get_sheet);

/**
 * @description : This will handle updates back up to SalesForce.
 * @post : https://appname.herokuapp.com/salesforce/update
 * @author Doug Jodrell, Traction on Demand
 * @date 2016-Aug-4
 */
router.post('/update', sf_handler.update_salesforce);
router.get('/update', sf_handler.update_salesforce);


module.exports = router;