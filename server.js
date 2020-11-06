#!/usr/bin/env node
const express = require('express')
const session = require('express-session');
const bodyParser = require('body-parser');
const housenka_class = require('./housenka_server.js')
const WebSocket = require('ws')
const fs = require('fs');

const songLink = 'https://docs.google.com/uc?export=open&id=14t2BJcqWToek8niPG4rxZSODfh4ocmuC';

/**
 * Variables
 *
 */
const app = express()
const port = 8080;
const websocket_port = 8082;

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
    this.level=lvl;
  }
}

class MySession{
  constructor(user,score,lvl,sessionID) {
    this.user = user;
    this.score = score;
    this.level = lvl;
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

  console.log("CONNECTED WITH COOKIE "+getSessionID(req.headers.cookie));

  var found = false;
  for(var j=0;j<users_conn.length;j++)
  {
    if(users_conn[j][1] === getSessionID(req.headers.cookie)){
      console.log("DUPLICATE!!!!");
      //users_conn[j][0] = ws;
      //found = true;
      //var foundGame = getGame(getSessionID(req.headers.cookie));

      for(var i=0;i<games.length;i++) {
        if (games[i].session.sessionID === users_conn[j][1]) {
          games.splice(games.indexOf(i),1);
        }
      }
      users_conn.splice(users_conn.indexOf(j),1);


      break;
    }
  }


    users_conn.push([ws, getSessionID(req.headers.cookie)]);

    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].sessionID === getSessionID(req.headers.cookie)) {
        console.log("FOUND SESSION");
        game = new Game(sessions[i], code++, null, new housenka_class());
        games.push(game);
        break;
      }
    }


  ws.on('message', message => {
    //console.log(`Received message => ${message}`)
    var game = getGame(getSessionID(req.headers.cookie))
    if(game && !game.started)
    {
      if(message === 'GETIMG')
      {
        ws.send('img '+JSON.stringify(game.housenka.getImagesArr()));
        game.housenka.novaHra();
      }
      if(message === 'READY')
      {
        var info = updateScore(game,false)
        ws.send('area '+info+' '+JSON.stringify(game.housenka.getArray()));
      }
    }


  })

});


wss.on('sendArray', (data) => {

  console.log('COUNT OF GAMES '+games.length);
  //console.log(games)
  for(var k =0;k<games.length;k++)
  {
    //console.log(k)
    console.log("GAME "+k+" started "+games[k].started);
  }

  for(var i=0;i<users_conn.length;i++)
  {
    var game = getGame(users_conn[i][1]);
    if(game!=null && game.started) {
      if(game.session.user)
        console.log("Connected " + game.session.user.email);
      var ended = game.housenka.pohybHousenky();
      var scoreInfo = updateScore(game,ended);
      users_conn[i][0].send('area '+scoreInfo+' '+JSON.stringify(game.housenka.getArray()));
    }
    else{
      if(game)
        console.log('GAME STATUS '+game.started);
      else
        console.log('GAME NOT FOUND!');
    }
  }
})

setInterval(function(){
  wss.emit('sendArray','MY MESSAGE');
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
  req.session.cookie.maxAge = 20000; //po 6 min vyprsi session ? TODO


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
    sessions.push(new MySession(null,0,1,req.sessionID));
  }

  //Pre teraz staci toto
  res.render('index.html');

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

  var user = new User(req.body.email,req.body.name,req.body.password,0,1);
  users.push(user);

  console.log(users);
})

app.post('/login',((req, res) => {

  for(var i =0;i<users.length;i++)
  {
    if(users[i].email === req.body.email && users[i].password === req.body.password)
    {
      req.session.email = req.body.email;
      req.session.name = users[i].name;
      for(var j=0;j<sessions.length;j++)
      {
        if(sessions[j].sessionID === req.sessionID)
        {
          sessions[j].user = users[i];
          break;
        }
      }

      //refresh stats
      refreshStats(req.sessionID);

      if(req.body.email === 'admin')
        res.redirect('/admin');
      else {
        console.log(createLogout(req.session.name));
        res.send(createLogout(req.session.name));
      }


      return;
    }
  }

  res.send('NOPE!');
}))


app.post('/up',(req,res)=> {

  console.log("GOT UP "+req.body.code);

  if(req.cookie) {
    console.log(req.cookie.maxAge);
    console.log(req.cookie);
  }

  var game = getGame(req.sessionID);

  if(game!=null)
    game.housenka.stiskKlavesy(parseInt(req.body.code));

  res.end();
})

app.post('/down',(req,res)=> {
  var game = getGame(req.sessionID);

  if(game!=null)
    game.housenka.uvolneniKlavesy(parseInt(req.body.code));

  res.end()
})

app.post('/getmenu',(req,res)=> {
  console.log("SENGING TABLE");
  res.send(createTable());
  res.end();
})

app.post('/start',(req,res)=> {
  getGame(req.sessionID).started = true;
  console.log('Starting game!!');
  res.end();
})

app.post('/pause',(req,res)=> {
  getGame(req.sessionID).started = false;
  res.end();
})

app.get('/admin',function(req,res){

  console.log("CALLED ADMIN");
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

app.get('/download',function (req,res){

  var name= req.sessionID+0;
  var iter=1;
  while(true){
    try {
      if (fs.existsSync(name)) {
        name = req.sessionID+iter;
        iter++;
      }
      else
        break;
    } catch(err) {
      console.error(err)
    }
  }
  var download = getGame(req.sessionID).housenka;

  fs.writeFile(name, JSON.stringify(download), (err) => {
    if (err) {
      throw err;
    }

    res.set("Content-Type", "application/octet-stream");
    res.download(name);

    //Zmazanie suboru po 60 sec
    setTimeout(()=>{
      try {
        fs.unlinkSync(name)
        console.log('deleted '+name);
      } catch(err) {
        console.error(err)
      }
    },60000)
  });

});

app.post('/upload',function(req,res){

  var h = new housenka_class();
  var result = JSON.parse(req.body['obj']);

  for (const [aaa, bbb] of Object.entries(result)) {
    h[aaa] = bbb;
  }

  var moving =getGame(req.sessionID).housenka.moving;
  h.moving = moving;
  getGame(req.sessionID).housenka = h;
  res.end();
});

app.post('/logout',function(req,res){

  var session = getSession(req.sessionID);
  if(session)
    session.user = null;

  refreshStats(req.sessionID);

  res.send(createUserPart());

});



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


/**
 * Helper functions
 */

function refreshStats(sessionID)
{
  for(var i=0;i<users_conn.length;i++)
  {
    if(users_conn[i][1] === sessionID) {
      var game = getGame(users_conn[i][1]);
      if (game != null) {
        var scoreInfo = updateScore(game, false);
        users_conn[i][0].send('area ' + scoreInfo + ' ' + JSON.stringify(game.housenka.getArray()));
      }
      break;
    }
  }
}


//connect.sid=s%3Ag57IbGaNr6yMz4FbOMasXu4PtRtxkT2A.1SEXmdvIBVuPgMH61F0w5bKs8JTsfk1%2BDnjFHIHwexk
function getSessionID(raw_text)
{
  //TODO check
  const raw_cookie = raw_text.split("connect.sid=s%3A");
  return raw_cookie[1].split('.')[0];
}

function getSession(sessionID)
{
  for(var i=0;i<sessions.length;i++)
  {
    if(sessions[i].sessionID === sessionID)
      return sessions[i];
  }
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

function updateScore(game,ended) {
  var score=0;
  var lvl =1;
  let maxScore = 0;
  var maxLvl = 1;
  var info = '';

  if (game) {
    score = game.housenka.body;
    lvl = game.housenka.level;
  }

  //Prepisanie najlepsich hodnot za session
  var session = game.session;
  if (session.score < score) {
    session.score = score;
  }
  if (session.level < lvl) {
    session.level = lvl
  }

  //Prepisanie najlepsich hodnot za hraca
  var user = session.user;
  if (user) {
    if (user.score < score) {
      user.score = score;
    }
    if (user.level < lvl) {
      user.level = lvl
    }

    //Zistenie maximalneho score
    if (session.score > user.score)
      maxScore = session.score;
    else
      maxScore = user.score;

    //Zistenie maximalneho levelu
    if (session.level > user.level)
      maxLvl = session.level;
    else
      maxLvl = user.level;

  } else {
    maxScore = session.score;
    maxLvl = session.level;
  }

  //Posielame maxScore actScore maxLvl actLvl
  info = maxScore + " " + score + " " + maxLvl + " " + lvl;

  //TODO update leaderboard
  if (ended) {
    console.log("remaining " + game.housenka.lives + " lives");
    game.housenka.koncime();
    if (game.housenka.lives <= 0) {
      console.log("YOU LOST!");

      game.housenka.restartGame();
    }

  }

  return info;
}


/**
 * HTML to JSON helper functions
 *
 */

function createObject(params)
{
  var obj = {};
  for(var i=0;i<params.length;i++)
  {
    obj[params[i][0]] = params[i][1];
  }

  return obj;
}

function createLogout(name)
{
  return createObject([['tag', 'div'], ['id', 'logoutMenu'], ['innerTags', [
    createLabel('Logged in as ' + name, '30px'),
    createObject([['tag', 'br']]),
    createObject([['tag', 'br']]),
    createButton('Logout', 'logout', 'logout')
  ]]]);
}

function createLabel(text,size)
{
  const labelStyle = createObject([['fontSize', size]]);
  return createObject([['tag','label'],['innerText',text],['style',labelStyle]]);
}

function createButton(text,functionName,id)
{
  const style = createObject([['width', '190px'], ['height', '50px'],['fontSize','23px']]);
  return createObject([['tag', 'button'], ['id',id] ,['innerHTML', text], ['style', style], ['onclick', functionName]]);
}

function createInputField(id)
{
  const style = createObject([['width', '180px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'text'], ['style', style]]);
}

function createPasswordField(id)
{
  const style = createObject([['width', '180px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'password'], ['style', style]]);
}

function createUploadField(id) {
  const style = createObject([['width', '180px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'file'], ['style', style]]);
}

function createStatLabel(id)
{
  return createObject([['tag', 'h2'], ['id', id], ['innerHTML', 'randomtext']]);
}

function createUserPart()
{
  const br = createObject([['tag', 'br']]);

  return createObject([['tag', 'div'], ['id', 'userPart'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Email','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('emailLogin')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Password','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createPasswordField('passwordLogin')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Log in','logIn','passwordBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Email','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('emailRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Name','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('nameRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Password','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createPasswordField('passwordRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Register','register','registerBtn')]]]), br

  ]]]);
}

function createTable()
{
  const br = createObject([['tag', 'br']]);

  const otherPart = createObject([['tag', 'div'], ['id','otherPart'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [createLabel('PIN','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('pin')]]]),br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Connect','todo','connectBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Leaderboards','todo','leaderboardBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Show all games','todo','showGamesBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createUploadField('loadGame')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Load game','loadGame','loadBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Save game','saveGame','saveBtn')]]]), br
  ]]]);


  const gamePart = createObject([['tag', 'table'], ['id', 'housenka'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [
      createObject([['tag', 'td'], ['innerTags', [
        createObject([['tag', 'canvas'], ['width', '1968'], ['height', '1488'], ['id', 'canvas']])
      ]]]),
      createObject([['tag', 'td'], ['width', '15']]),
      createObject([['tag', 'td'], ['valign', 'top'], ['align', 'left'], ['id', 'stats'], ['innerTags', [
        createObject([['tag','audio'],['src',songLink],['id','audio'],['loop','true']]),
        createButton('Turn on audio','changeAudioStatus','audioBtn'),br,
        createStatLabel('maxScoreLabel'), br,
        createStatLabel('maxLvlLabel'), br,
        createStatLabel('scoreLabel'), br,
        createStatLabel('lvlLabel'), br,
        createObject([['tag', 'tr'], ['innerTags', [createButton('Start new game','changeGameStatus','statusBtn')]]]), br,
        otherPart, br
      ]]]),
      createObject([['tag', 'td'], ['width', '15']]),
      createObject([['tag', 'td'], ['valign', 'top'], ['align', 'left'], ['id', 'stats'], ['innerTags', [
        createUserPart()
      ]]])
    ]]])
  ]]]);

  //console.log(gamePart);

  return gamePart;

}