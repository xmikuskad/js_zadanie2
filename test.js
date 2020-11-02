#!/usr/bin/env node

var debug = require('debug')('server:server');
var http = require('http');
const express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser')
const housenka = require('./housenka_server.js')

const app = express()
var port = 8080;
var websocket_port = 8082;

const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: websocket_port })


//EXPRESS
app.use("/static", express.static('./static/'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

//Sessions testing
app.use(session({
    secret: 'housenka',
    resave: true,
    saveUninitialized: true,
}));

app.get('/index', function(req, res) {
    res.sendFile('views/index_housenka.html', {root: __dirname})
});

app.post('/added',function(req, res)  {
    var btns = '<input id="email" type="text">' +
        '<br>' +
        '<input id="password" type="password">' +
        '<br>' +
        '<button id="register">Register</button>' +
        '<button id="login">Login</button>' +
        '</body>';
    res.send(JSON.stringify(btns));
});

app.post('/added2',function(req, res)  {
    var btns ='$("#login").click(function(){console.log("CLICK!?");});';
    res.send(JSON.stringify(btns));
});

app.get('/', function(req, res) {
    console.log("Hello!");
});




app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
