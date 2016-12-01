/**
 * google.js
 * @description : serves as all google route calls
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */

var express = require('express');
var router = express.Router();
var google_handler = require('google/google_handler');



/**
 * @description : This will be the listener to handle the oauth callbak from google,
 *                 it will update the user_security table with google token
 * @url : https://appname.herokuapp.com/google/callbak
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
router.get('/callback', google_handler.auth_callback);


/**
 * @description : This will be the listener to handle notification message from google when an update happens
 * @post : https://appname.herokuapp.com/google/trigger
 * @author Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
router.get('/trigger', google_handler.trigger_handler);


module.exports = router;