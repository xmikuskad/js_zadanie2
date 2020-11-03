#!/usr/bin/env node
const express = require('express')
const session = require('express-session');
const bodyParser = require('body-parser');
const housenka_class = require('./housenka_server.js')
const WebSocket = require('ws')

/**
 * Variables
 *
 */
const app = express()
var port = 8080;
var websocket_port = 8082;

var sessions = []; //Array of active sessions
var code = 0;
var users_conn = [];
var users=[]; //array of Users registered
var games=[]; //array of Game played

/**
 * Classes
 *
 */

class User{
  constructor(email,name,pass,score,lvl){
    this.email =email;
    this.password = pass;
    this.name = name
    this.score= score;
    this.lvl=lvl;
  }
}

class MySession{
  constructor(user,score,lvl,sessionID) {
    this.user = user;
    this.score = score;
    this.lvl = lvl;
    this.sessionID = sessionID;
  }
}

class Game {
  constructor(session, pin,spectators,housenka) {
    this.session = session;
    this.pin = pin;
    this.spectators = spectators;
    this.housenka = housenka;
    this.started = false;
  }
}

/**
 * Websocket
 */
const wss = new WebSocket.Server({ port: websocket_port })

wss.on('connection', (ws,req) => {
  var game = null;
  users_conn.push([ws,getSessionID(req.headers.cookie)]);

  for(var i=0;i<sessions.length;i++)
  {
    if(sessions[i].sessionID === getSessionID(req.headers.cookie))
    {
      console.log("FOUND SESSION");
      game = new Game(sessions[i],code++,null,new housenka_class());
      games.push(game);
      break;
    }
  }

  ws.on('message', message => {
    console.log(`Received message => ${message}`)
    console.log(getSessionID(req.headers.cookie));
    var game = getGame(getSessionID(req.headers.cookie))
    if(!game.started)
    {
      if(message === 'GETIMG')
      {
        ws.send('img '+JSON.stringify(game.housenka.getImagesArr()));
      }
      if(message === 'READY')
      {
        game.housenka.novaHra();
        game.started = true;
      }
    }


  })

});


wss.on('testik', (data) => {
  for(var i=0;i<users_conn.length;i++)
  {
    var game = getGame(users_conn[i][1]);
    if(game!=null && game.started) {
      if(game.session.user)
        console.log("Connected " + game.session.user.email);
      game.housenka.pohybHousenky();
      users_conn[i][0].send(JSON.stringify(game.housenka.getArray()));
    }
  }
})


setInterval(function(){
  wss.emit('testik','MY MESSAGE');
}, 250);

/**
 * Express sessions
 *
 */

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
  res.sendFile('views/index.html', {root: __dirname})
});


app.get('/', function(req, res) {

  req.session.cookie.expires = true
  req.session.cookie.maxAge = 360000;
  var id = req.sessionID;
  console.log("EXPRESS "+id);


  var is_added = false;
  for(var i=0;i<sessions.length;i++)
  {
    if(sessions[i].sessionID === req.sessionID) {
      is_added = true;
      break;
    }
  }
  if(!is_added)
  {
    sessions.push(new MySession(null,0,0,req.sessionID));
  }

  //Prihlasenie
  if(req.session.email)
  {
    res.redirect('/logged');
  }
  else
  {
    res.render('index.html');
  }

});

app.post('/register',(req,res)=> {
  for(var i =0;i<users.length;i++)
  {
    if(users[i].email === req.body.email)
    {
      res.send("NOPE!");
      return;
    }
  }

  var user = new User(req.body.email,req.body.name,req.body.password,0,0);
  users.push(user);

  console.log(users);
})

app.post('/login',((req, res) => {

  for(var i =0;i<users.length;i++)
  {
    console.log(req.body.email+" | "+req.body.password);
    if(users[i].email === req.body.email && users[i].password === req.body.password)
    {
      req.session.email = req.body.email;

      for(var i=0;i<sessions.length;i++)
      {
        if(sessions[i].sessionID === req.sessionID)
        {
          sessions[i].user = users[i];
          break;
        }
      }


      res.send("OK");
      return;
    }
  }

  res.send('NOPE!');
}))


app.post('/up',(req,res)=> {
  console.log("UP "+req.body.code);
  var game = getGame(req.sessionID);

  if(game!=null)
    game.housenka.stiskKlavesy(parseInt(req.body.code));

  res.end();
})

app.post('/down',(req,res)=> {
  console.log("DOWN "+req.body.code);
  var game = getGame(req.sessionID);

  if(game!=null)
    game.housenka.uvolneniKlavesy(parseInt(req.body.code));

  res.end()
})

app.get('/admin',function(req,res){

  if(req.session.email) {
    res.write('<h1>Hello '+req.session.email+'</h1>');
    res.write('<a href="/logout">Logout</a>');
    res.end();
  } else {
    res.write('<h1>Please login first.</h1>');
    res.write('<a href="/">Login</a>');
    res.end();
  }
});

/*
app.get('/logout',function(req,res){

  // if the user logs out, destroy all of their individual session
  // information
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });

});
*/


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


/**
 * Helper functions
 */

//connect.sid=s%3Ag57IbGaNr6yMz4FbOMasXu4PtRtxkT2A.1SEXmdvIBVuPgMH61F0w5bKs8JTsfk1%2BDnjFHIHwexk
function getSessionID(raw_text)
{
  //TODO check
  const raw_cookie = raw_text.split("connect.sid=s%3A");
  return raw_cookie[1].split('.')[0];
}

function getGame(sessionID)
{
  for(var i=0;i<games.length;i++)
  {
    if(games[i].session.sessionID === sessionID) {
      return games[i];
    }
  }

  return null;
}