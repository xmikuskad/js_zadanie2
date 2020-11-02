#!/usr/bin/env node
const express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser')
const housenka_class = require('./housenka_server.js')
//import Housenka from "./housenka_server";

const app = express()
var port = 8080;
var websocket_port = 8082;

/**
 * Websocket
 */

const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: websocket_port })

var started = false;
var id ="";


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
    if(games[i].session.sessionID === sessionID)
      return games[i];
  }

  return null;
}

var code = 0;
var housenka = new housenka_class();

var users_conn = [];
wss.on('connection', (ws,req) => {
  var game = null;
  users_conn.push([ws,getSessionID(req.headers.cookie)]);

  ws.on('message', message => {
    console.log(`Received message => ${message}`)
    console.log(getSessionID(req.headers.cookie));

    for(var i=0;i<sessions.length;i++)
    {
      if(sessions[i].sessionID === getSessionID(req.headers.cookie))
      {
        console.log("FOUND SESSION");
        game = new Game(sessions[i],code++,null,new housenka_class());
        games.push(game);
      }
    }

    if(!started)
    {
      if(message === 'GETIMG')
      {
        ws.send('img '+JSON.stringify(game.housenka.getImagesArr()));
      }
      if(message === 'READY')
      {
        game.housenka.novaHra();
        started = true;
        setInterval(function(){
          if(started === true) {
            game.housenka.pohybHousenky();
            ws.send(JSON.stringify(game.housenka.getArray()));
            //console.log(req)
          }
        }, 250);
      }
    }


  })

  /*setInterval(function() {
    if (started === true) {
      game.housenka.pohybHousenky();
      ws.send(JSON.stringify(game.housenka.getArray()));
      //console.log(req)
    }
  }, 250);*/

});

wss.on('testik', (data) => {
  // data.data contains your forwarded data
  console.log('CHECKING');
  /*wss.clients.forEach(function each(client) {
    console.log('Client.ID: ' + client.readyState);
    console.log(Object.keys(client));
  });*/
  for(var i=0;i<users_conn.length;i++)
  {
    //console.log(sessions);
    //console.log("Connected "+getGame())
    var game = getGame(users_conn[i][1]);
    if(game!=null)
      console.log("Connected "+getGame(users_conn[i][1]).session.user.email);

    /*or(var j=0;j<sessions.length;j++)
    {
      if(sessions[j] === users_conn[i][j])
        console.log(sessions[i])
    }*/
    //console.log("HUH? " +users_conn[0]);
  }
})
setInterval(function(){
  wss.emit('testik','MY MESSAGE');
}, 2000);


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


var sessions = [];
/*
app.get('/data',(req,res)=> {

  console.log(sessions)

  for(var iter=0;iter<sessions.length;iter++){
    (function(i) {
      req.sessionStore.get(sessions[i], (err, session) => {

        //Kontrola ci uzivatel este stale existuje
        if (session !== undefined) {
          console.log('Name:' + session.name + " Views:" + session.views + " CookieID:" + sessions[i]);
          console.log(Date.parse(session.cookie.expires) - Date.now())
          res.write('<p> Name:' + session.name + " Views:" + session.views + " CookieID:" + sessions[i] + ' expires in ' +
              (Date.parse(session.cookie.expires) - Date.now())+'</p>');
        } else {
          console.log('Session ' + sessions[i] + " expired");
          sessions.splice(i);
        }

      })
    })(iter);
  }
  res.end()
})
*/
app.get('/', function(req, res) {

  req.session.cookie.expires = true
  req.session.cookie.maxAge = 360000;
  var id = req.sessionID;
  //var id = req.sessionID;

  console.log("EXPRESS "+id);

  //Pridanie aktivneho uzivatela
  /*if (!sessions.includes(id)) {
    sessions.push(id);
  }*/

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
    //var ses = new MySession(null,0,0,req.sessionID);
    sessions.push(new MySession(null,0,0,req.sessionID));
  }

  /*var sess = req.session
  sess.name = "HUE";
  if (sess.views) {
    sess.views++
    res.setHeader('Content-Type', 'text/html')
    console.log(sess.cookie.maxAge);
    res.write('<p>views: ' + sess.views + '</p>'+'<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>')
    //res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>')
    res.end()
  } else {
    sess.views = 1
    res.end('welcome to the session demo. refresh!')
  }*/

  //Prihlasenie
  if(req.session.email)
  {
    res.redirect('/logged');
  }
  else
  {
    res.render('index_housenka.html');
  }

});

app.post('/register',(req,res)=> {
  //res.send('done');

  //console.log(req.body.email+" "+req.body.password)*/

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

app.post('/test',(req,res)=> {

  res.write('<button id="sender">CLICK ME</button>');
  res.end()

  console.log(req.body.email+" "+req.body.password)
})
app.post('/up',(req,res)=> {
  console.log("UP "+req.body.code);
  housenka.stiskKlavesy(parseInt(req.body.code))
  res.end();
})
app.post('/down',(req,res)=> {
  console.log("DOWN "+req.body.code);
  housenka.uvolneniKlavesy(parseInt(req.body.code))
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

var users=[]; //array of User
var games=[]; //array of Game
var leaderboard = []; // array (max 25) of top Game

class User{
  constructor(email,name,pass,score,lvl){
    this.email =email;
    this.password = pass;
    this.name = name
    this.score= score;
    this.lvl=lvl;
  }

  endGame(score,lvl) {
    if(score > this.score)
      this.score = score;
    if(lvl > this.lvl)
      this.lvl = lvl;
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
  }
}
