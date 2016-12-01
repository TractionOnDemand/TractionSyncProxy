/**
 * server.js
 * @description : serves as all salesforce route calls
 * @author Doug Jodrell, Ricardo Visbal, Traction on Demand
 * @date 2016-Jul-25
 */
const path = require('path');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.set('port', process.env.PORT || 5000);
app.set('views', __dirname + '/client/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/client'));

app.use(bodyParser.json({limit: 5000000}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: 5000000,
    parameterLimit: 10000000
}));

var instructions = 'After installing the package, add the ListViewExporter custom lightning component to the Opportunity record page layout.'

app.get("/", function(req, res) {
    res.send(instructions);
});

var salesforce_router = require('router/salesforce.js');
app.use('/salesforce', salesforce_router);

var google_router = require('router/google.js');
app.use('/google', google_router);

var pg_router = require('router/pg.js');
app.use('/pg', pg_router);


app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});