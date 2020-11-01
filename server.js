#!/usr/bin/env node

var debug = require('debug')('server:server');
var http = require('http');
const express = require('express')
const xd = require('./housenka_server.js')

const app = express()
var port = 8080;
var websocket_port = 8082;

/**
 * Websocket
 */

/*var server = http.createServer(app);

server.listen(websocket_port);
server.on('listening', onListening);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}*/
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8082 })

var started = false;

wss.on('connection', ws => {
  ws.on('message', message => {
    console.log(`Received message => ${message}`)
    var msg = message.split(" ");
    if(started)
    {
      if(msg[0] === 'UP')
      {
        xd.stiskKlavesy(parseInt(msg[1]))
      }
      else
      {
        xd.uvolneniKlavesy(parseInt(msg[1]))
      }
      console.log(msg[0]);
    }
    else
    {
      if(message === 'READY')
      {
        console.log("LAG?!");
        xd.novaHra();
        started = true;
        console.log("STARTED!");
      }
    }


  })
  //ws.send('ho!')
  setInterval(function(){
    if(started === true)
      xd.pohybHousenky();
      ws.send(JSON.stringify(xd.getArray()));
  }, 250);
});


//EXPRESS
app.use("/static", express.static('./static/'));
//Moje funkcie
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

app.get('/index', function(req, res) {
  //res.sendFile('housenka_client.js', {root: __dirname })
  res.sendFile('index.html', {root: __dirname })
});



