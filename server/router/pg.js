var express = require('express');
var router = express.Router();

var pg_setup = require('pg/pg_setup');

const SETUP_DISABLED = false;

router.get("/", function(req, res) {
    res.send('Postgress router')
});

router.get('/setup_db', function(req, res) {
    if (SETUP_DISABLED) {
        res.send('Database setup has been disabled.');
    } else {
        pg_setup.create_tables(req, res);
    }
});


module.exports = router;