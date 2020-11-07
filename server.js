#!/usr/bin/env node
const express = require('express')
const session = require('express-session');
const bodyParser = require('body-parser');
const housenka_class = require('./housenka_server.js')
const WebSocket = require('ws')
const fs = require('fs');

const SONG_LINK = 'https://docs.google.com/uc?export=open&id=14t2BJcqWToek8niPG4rxZSODfh4ocmuC';
const NO_USER = "[N/A]";
const MAX_LEADERBOARD_COUNT = 10; //Only top 10 players
const PORT = 8080;
const WEBSOCKET_PORT = 8082;

/**
 * Variables
 *
 */
const app = express()

var sessions = []; //Array of active sessions
var users_conn = [];
var users=[]; //array of Users registered
var games=[]; //array of Game played
var leaderboard = [];
var pins = {};

var sessionCheckerTimer;

/**
 * Classes
 *
 */

class LeaderboardItem{
  constructor(name,score,level) {
    this.name = name;
    this.score = score;
    this.level = level;
  }
}

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
 * Initialization
 *
 */

//Add admin account
users.push(new User('admin','admin','21232f297a57a5a743894a0e4a801fc3',0,1)) //heslo je tiez admin

//Add all pins and set to false
for(let i=0; i<10000; i++)
{
  let pin = '';

  switch (i.toString().length)
  {
    case 1:
      pin = '000';
      break;
    case 2:
      pin = '00';
      break;
    case 3:
      pin = '0';
      break;
    case 3:
      pin = '';
      break;
  }
  pin += i;
  pins[pin] = false;
}


/**
 * Server handling
 */

const wss = new WebSocket.Server({ port: WEBSOCKET_PORT })

wss.on('connection', (ws,req) => {
  var game = null;
  var found = false;

  for(var j=0;j<users_conn.length;j++)
  {
    if(users_conn[j][1] === getSessionID(req.headers.cookie)){
      console.log("DUPLICATE!!!!");

      for(var i=0;i<games.length;i++) {
        if (games[i].session.sessionID === users_conn[j][1]) {
          pins[games[i].pin] = false;
          games.splice(i,1);
        }
      }
      users_conn.splice(j,1);


      break;
    }
  }
  //Reset timeru lebo sme ich prave pozreli
  clearInterval(sessionCheckerTimer);
  sessionCheckerTimer = null;
  sessionCheckerTimer =   setInterval(function(){
    wss.emit('checkSessions');
  }, 2000);
  //checkSessions();

  users_conn.push([ws, getSessionID(req.headers.cookie)]);

  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].sessionID === getSessionID(req.headers.cookie)) {
      game = new Game(sessions[i], getAvailablePin(), [], new housenka_class());
      games.push(game);
      break;
    }
  }


  ws.on('message', message => {
    //console.log(`Received message => ${message}`)
    var game = getGame(getSessionID(req.headers.cookie))
    if (game && !game.started) {
      if (message === 'GETIMG') {
        ws.send('img ' + JSON.stringify(game.housenka.getImagesArr()));
        game.housenka.novaHra();
      }
      if (message === 'READY') {
        var info = updateScore(game, false)
        ws.send('area ' + info + ' ' + JSON.stringify(game.housenka.getArray()));
      } else {
        console.log("GOT MSG " + message);
      }
    }


  })

});

wss.onclose = () => {
  console.log("closed");
};

wss.on('checkSessions', ()=>{
  checkSessions();
})

wss.on('sendArray', (data) => {

  for (var i = 0; i < users_conn.length; i++) {
    //var game = getGame(users_conn[i][1]);
    var game_info = getGameWithSpectators(users_conn[i][1]);
    var scoreInfo = 'unknown unknown unknown unknown';
    if (game_info != null) {
      var game = game_info[0];
      var isOwner = game_info[1];
      if (game.started) {
        /*if(game.session.user)
          console.log("Connected " + game.session.user.email);*/
        if (isOwner) {
          var ended = game.housenka.pohybHousenky();
          scoreInfo = updateScore(game, ended, isOwner);
        }

        users_conn[i][0].send('area ' + scoreInfo + ' ' + JSON.stringify(game.housenka.getArray()));
      } else {
        users_conn[i][0].send('area ' + scoreInfo + ' ' + JSON.stringify(game.housenka.getArray()));
      }
    }
  }

})

function checkSessions()
{
  for(var k=0;k<users_conn.length;k++)
  {
    if(users_conn[k][0].readyState === 3) //Spojenie bolo zrusene
    {
      console.log('Deleting user info');
      var sessionID = users_conn[k][1];
      //Delete game
      for(var i=0;i<games.length;i++) {
        if (games[i].session.sessionID === sessionID) {
          pins[games[i].pin] = false;
          games.splice(games.indexOf(i),1);
          break;
        }
      }
      //Delete session
      for(var j=0;j<sessions.length;j++)
      {
        if(sessions[j].sessionID === sessionID)
        {
          sessions.splice(sessions.indexOf(j),1);
        }
      }
      //Delete client
      users_conn.splice(k,1);
    }
  }
}

//Odosielanie plochy kadzych 250 ms
setInterval(function(){
  wss.emit('sendArray','MY MESSAGE');
}, 250);

//Kontrola zrusenych sessons kazdych 10 min
sessionCheckerTimer = setInterval(function(){
  wss.emit('checkSessions');
}, 2000);



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
  saveUninitialized: true
}));

app.get('/index', function(req, res) {
  res.sendFile('views/index.html', {root: __dirname})
});


app.get('/', function(req, res) {

  //req.session.cookie.expires = true
  //req.session.cookie.maxAge = 200000; //po 6 min vyprsi session ? TODO


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
    if(users[i].email === req.body.email || users[i].name === req.body.name)
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

      if(req.body.email === 'admin') {
        //TODO ADMIN
        res.send(createAdminMenu());
      }
      else {
        res.send(createLogout(req.session.name));
      }


      return;
    }
  }

  res.send('WRONG');
}))


app.post('/up',(req,res)=> {

  var game;
  if(req.body.owner === 'true') {
    console.log('GOT OWNER');
    game = getGame(req.sessionID);
  }
  else{
    console.log('GOT SPECTATOR');
    game = getGameWithSpectators(req.sessionID)[0];
  }

  if(game!=null) {
    console.log('FOUND GAME!!');
    game.housenka.stiskKlavesy(parseInt(req.body.code));

    if(req.body.owner === 'false')
      game.housenka.uvolneniKlavesy(parseInt(req.body.code))
  }

  res.end();
})

app.post('/down',(req,res)=> {
  var game;
  if(req.body.owner === 'true')
    game= getGame(req.sessionID);

  if(game!=null)
    game.housenka.uvolneniKlavesy(parseInt(req.body.code));

  res.end()
})

app.get('/getmenu',(req,res)=> {
  res.send(createTable());
  res.end();
})

app.post('/start',(req,res)=> {
  getGame(req.sessionID).started = true;
  res.end();
})

app.post('/pause',(req,res)=> {
  getGame(req.sessionID).started = false;
  res.end();
})

app.get('/connect', function(req,res) {
  var pin = req.body.pin;
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

app.get('/logout',function(req,res){

  var session = getSession(req.sessionID);
  if(session)
    session.user = null;

  refreshStats(req.sessionID);

  res.send(createUserPart());

});

app.get('/leaderboard', function(req,res) {
  res.send(createLeaderboard());
})

app.get('/activegames',function(req,res) {
  res.send(createActiveGames(req.sessionID));
})

app.get('/showusers',function(req,res) {
  //TODO check if user is admin
  if(getSession(req.sessionID).user.name === 'admin'){
    res.send(createAdminTable());
  }
  else {
    res.end();
  }
})

app.get('/saveusers', function(req,res){
  if(getSession(req.sessionID).user.name === 'admin') {

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
    var download = getUsersData();

    fs.writeFile(name, download, (err) => {
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
      },120000)
    });

    //res.send(getUsersData());
  }
  else
    res.end();
})

app.post('/loadusers',function(req,res){
  if(getSession(req.sessionID).user.name === 'admin') {
    var result = req.body['obj'];

    loadUserData(result);
  }

  res.end();
})

app.post('/connect',function(req,res){

  var pin = req.body.pin;
  var onlyWatching = req.body.watching;

  var game = getGame(req.sessionID);

  if(!game || game.pin === pin || !pins[pin])
  {
    res.end();
    console.log("wrong pin !");
    return;
  }

  pins[game.pin] = false;
  games.splice(games.indexOf(game),1);

  for(var i=0;i<games.length;i++)
  {
    if(games[i].pin === pin)
    {
      games[i].spectators.push(getSession(req.sessionID));
      break;
    }
  }

  console.log('onlyWatching = '+onlyWatching);
  console.log(typeof(onlyWatching));
  if(onlyWatching === 'true') {
    console.log('ONLY DISCONNECT');
    res.send(createDisconnect(pin))
  }
  else {
    console.log('ADDED CONTROL');
    //console.log(createControlBtns(pin))
    res.send(createControlBtns(pin));
  }
  //res.end();

})

app.get('/disconnect',function(req,res) {

  for(var i=0;i<games.length;i++)
  {
    for(var j=0;j<games[i].spectators.length;j++)
    {
      var array = games[i].spectators;
      if(array[j].sessionID === req.sessionID)
      {
        array.splice(j,1);
        var game = new Game(getSession(req.sessionID), getAvailablePin(), [], new housenka_class());
        game.housenka.novaHra();
        games.push(game);

        res.send(getConnectPart());
        return;
      }
    }
  }

  //res.send(getConnectPart());

})

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
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

//Ziskanie sessionID z "connect.sid=s%3Ag57IbGaNr6yMz4FbOMasXu4PtRtxkT2A.1SEXmdvIBVuPgMH61F0w5bKs8JTsfk1%2BDnjFHIHwexk"
function getSessionID(raw_text)
{
  const raw_cookie = raw_text.split("connect.sid=s%3A");
  return raw_cookie[1].split('.')[0];
}

function getAvailablePin()
{
  for(var i=0;i<10000;i++)
  {
    var pin= '';
    switch (i.toString().length)
    {
      case 1:
        pin = '000';
        break;
      case 2:
        pin = '00';
        break;
      case 3:
        pin = '0';
        break;
      case 3:
        pin = '';
        break;
    }
    pin+=i;

    if(!pins[pin])
    {
      console.log('PIN '+pin+' is free!');
      pins[pin] = true;
      return pin;
    }
  }

  return null;
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

function getGameWithSpectators(sessionID)
{
  for(var i=0;i<games.length;i++)
  {
    var game = games[i];
    if(game.session.sessionID === sessionID) {
      return [game,true];
    }
    for(var j=0;j<game.spectators.length;j++){
      if(game.spectators[i].sessionID === sessionID) {
        return [game,false];
      }
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

  if (ended) {
    var name;
    if(user)
      name = user.name;
    else
      name = NO_USER;

    updateLeaderboard(new LeaderboardItem(name,score,lvl));

    console.log("remaining " + game.housenka.lives + " lives");
    game.housenka.koncime();
    if (game.housenka.lives <= 0) {
      console.log("YOU LOST!");

      game.housenka.restartGame();
    }

  }

  return info;
}

function updateLeaderboard(item)
{
  console.log("Got item, leaderboard count "+leaderboard.length);
  if(leaderboard.length < MAX_LEADERBOARD_COUNT )
  {
    leaderboard.push(item);
    leaderboard.sort((a,b) => (a.score > b.score) ? 1:-1);
    return;
  }

  if(leaderboard[leaderboard.length-1].score < item.score)
  {
    leaderboard.push(item);
    leaderboard.sort((a,b) => (a.score > b.score) ? 1:-1);

    if(leaderboard.length > MAX_LEADERBOARD_COUNT)
      leaderboard.splice(leaderboard.indexOf(leaderboard.length-1),1);
  }
}

function getUsersData()
{
  var data = 'meno,email,heslo,maxscore,maxlvl\r\n';
  for(var i=0;i<users.length;i++)
  {
    var user = users[i];
    data+=user.name+","+user.email+','+user.password+','+user.score+','+user.level+'\r\n';
  }

  return data;
}

function loadUserData(data)
{
  console.log(data);

  users = [];

  var users_raw = data.split('\r\n');

  for(var i=1;i<users_raw.length;i++)
  {
    var user_data = users_raw[i].split(',');

    if(user_data.length === 5) {
      users.push(new User(user_data[0],user_data[1],user_data[2],user_data[3],user_data[4]));
    }

  }


}

/**
 * Create and convert HTML to JSON helper functions
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

function createDisconnect(pin) {
  var obj = createObject([['tag', 'div'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [
      createLabel('Connected to ' + pin, '30px')
    ]]]),
    createObject([['tag', 'tr'], ['innerTags', [
      createButton('Disconnect', 'disconnect', 'disconnectBtn')
    ]]]),
    createObject([['tag', 'br']])
  ]]])

  return obj;
}

function createControlBtns(pin)
{
  var obj = createObject([['tag', 'div'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [
      createButton('UP','spectatorMove','38')
    ]]]),
    createObject([['tag', 'tr'], ['innerTags', [
      createButton('LEFT','spectatorMove','37'),
      createButton('RIGHT','spectatorMove','39')
    ]]]),
    createObject([['tag', 'tr'], ['innerTags', [
      createButton('DOWN','spectatorMove','40')
    ]]]),
    createObject([['tag', 'br']]),
      createDisconnect(pin)
  ]]])

  return obj;
}

function getAdminTableData()
{
  const style = createObject([['fontSize', '35px']]);
  var header = createObject([['tag','tr'],['innerTags',[
    createObject([['tag','th'],['width','40%'],['style',style],['innerText','Name']]),
    createObject([['tag','th'],['width','45%'],['style',style],['innerText','Session']]),
    createObject([['tag','th'],['width','15%'],['style',style],['innerText','PIN']])
  ]]]);

  var obj = [header];

  for(var i=0;i<games.length;i++) {

    var item = games[i];
    var name;

    if(item.session.user){
      name = item.session.user.name;
    }
    else {
      name = NO_USER;
    }

    var tableItem = createObject([['tag','tr'],['innerTags',[
      createObject([['tag','td'],['width','40%'],['align','center'],['style',style],['innerText',name]]),
      createObject([['tag','td'],['width','45%'],['align','center'],['style',style],['innerText',item.session.sessionID]]),
      createObject([['tag','td'],['width','15%'],['align','center'],['style',style],['innerText',item.pin]]),
    ]]]);
    obj.push(tableItem);
  }

  return obj;
}

function createAdminTable()
{
  var style = createObject([['width','1000px']]);

  var leaderboard = createObject([['tag','div'],['id','adminTable'],['innerTags',[
    createObject([['tag','table'],['width','100%'],['style',style],['innerTags',
      getAdminTableData()
    ]])
  ]]])
  return leaderboard;
}

function getGamesData(sessionID)
{
  const style = createObject([['fontSize', '35px']]);
  var header = createObject([['tag','tr'],['innerTags',[
    createObject([['tag','th'],['width','30%'],['style',style],['innerText','Game number']]),
    createObject([['tag','th'],['width','40%'],['style',style],['innerText','User']]),
    createObject([['tag','th'],['width','30%'],['style',style]])
  ]]]);

  var obj = [header];

  for(var i=0;i<games.length;i++)
  {
    var item = games[i];
    var connectBtn;
    if(item.session.sessionID === sessionID) {
      connectBtn = createObject([['tag','div']]);
    }
    else {
      connectBtn = createButton('Watch game','watchGame',item.pin);
    }

    var username;

    if(item.session.user)
      username = item.session.user.name;
    else
      username = NO_USER;
    //games[i].pin
    var tableItem = createObject([['tag','tr'],['innerTags',[
      createObject([['tag','td'],['width','30%'],['align','center'],['style',style],['innerText',i+1]]),
      createObject([['tag','td'],['width','40%'],['align','center'],['style',style],['innerText',username]]),
      createObject([['tag','td'],['width','30%'],['align','center'],['innerTags',[
          connectBtn
      ]]])
    ]]]);
    obj.push(tableItem);
  }

  return obj;
}

function createActiveGames(sessionID) {
  var style = createObject([['width', '500px']]);

  var activeGames = createObject([['tag', 'div'], ['id', 'showActiveGames'], ['style', style], ['innerTags', [
    //createLabel('Active games', '40px'),
    createObject([['tag', 'table'], ['innerTags',
      getGamesData(sessionID)
    ]])
  ]]])
  return activeGames;
}

function createAdminMenu() {

  const br = createObject([['tag', 'br']]);
  var logout = createLogout('admin');

  var admin = [createButton('Show users','showUsers','showUsersBtn'),br,
      createButton('Save users','saveUsers','saveUsersBtn'),br,
    createUploadField('loadUsers'),br,
    createButton('Load users','loadUsers','loadUsersBtn'),br,logout]


  var obj = createObject([['tag','div'],['id','adminPart'],['innerTags',admin]]);

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
  return createObject([['tag','span'],['innerText',text],['display','inline-block'],['style',labelStyle]]);
}

function createButton(text,functionName,id)
{
  const style = createObject([['width', '210px'], ['height', '50px'],['fontSize','23px']]);
  return createObject([['tag', 'button'], ['id',id] ,['innerHTML', text], ['style', style], ['onclick', functionName]]);
}

function createInputField(id)
{
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'text'], ['style', style]]);
}

function createPasswordField(id)
{
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'password'], ['style', style]]);
}

function createUploadField(id) {
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'file'], ['style', style]]);
}

function createStatLabel(id)
{
  return createObject([['tag', 'h2'], ['id', id], ['innerHTML', 'randomtext']]);
}

function getLeaderboardData()
{
  const style = createObject([['fontSize', '35px']]);
  var header = createObject([['tag','tr'],['innerTags',[
    createObject([['tag','th'],['width','10%'],['style',style],['innerText','Rank']]),
    createObject([['tag','th'],['width','30%'],['style',style],['innerText','User']]),
    createObject([['tag','th'],['width','30%'],['style',style],['innerText','Level']]),
    createObject([['tag','th'],['width','30%'],['style',style],['innerText','Score']]),
  ]]]);

  var obj = [header];

  for(var i=0;i<leaderboard.length;i++)
  {
    var item = leaderboard[i];
    var tableItem = createObject([['tag','tr'],['innerTags',[
      createObject([['tag','td'],['width','10%'],['align','center'],['style',style],['innerText',i+1]]),
      createObject([['tag','td'],['width','30%'],['align','center'],['style',style],['innerText',item.name]]),
      createObject([['tag','td'],['width','30%'],['align','center'],['style',style],['innerText',item.level]]),
      createObject([['tag','td'],['width','30%'],['align','center'],['style',style],['innerText',item.score]])
    ]]]);
    obj.push(tableItem);
  }

  return obj;
}

function createLeaderboard()
{
  var style = createObject([['width','1000px']]);

  var leaderboard = createObject([['tag','div'],['id','leaderboard'],['style',style],['innerTags',[
      createObject([['tag','table'],['innerTags',
          getLeaderboardData()
      ]])
  ]]])
  return leaderboard;
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

function getConnectPart()
{
  const br = createObject([['tag', 'br']]);

  const connectPart = createObject([['tag','div'],['innerTags',[
    createObject([['tag', 'tr'], ['innerTags', [createLabel('PIN','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('pin')]]]),br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Connect','connect','connectBtn')]]])
  ]]]);

  return connectPart;
}

function createTable()
{
  const br = createObject([['tag', 'br']]);
  const startBtnStyle = createObject([['width', '210px'], ['height', '50px'],['fontSize','23px'],['background-color','green']]);
  var startButton = createObject([['tag', 'button'], ['id','statusBtn'] ,['innerHTML', 'Start new game'], ['style', startBtnStyle], ['onclick', 'changeGameStatus']]);


  const otherPart = createObject([['tag', 'div'], ['id','otherPart'], ['innerTags', [
    createObject([['tag','div'],['id','connectPart'],['innerTags',[getConnectPart()]]]),
    createObject([['tag', 'tr'], ['innerTags', [createButton('Show leaderboard','showLeaderboard','leaderboardBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Show all games','showActiveGames','showGamesBtn')]]]), br,
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
      createObject([['tag', 'td'], ['valign', 'top'], ['align', 'left'], ['innerTags', [
        createObject([['tag','audio'],['src',SONG_LINK],['id','audio'],['loop','true']]),
        createButton('Turn on audio','changeAudioStatus','audioBtn'),br,
        createStatLabel('maxScoreLabel'), br,
        createStatLabel('maxLvlLabel'), br,
        createStatLabel('scoreLabel'), br,
        createStatLabel('lvlLabel'), br,
        createObject([['tag', 'tr'], ['innerTags', [startButton]]]), br,
        otherPart, br
      ]]]),
      createObject([['tag', 'td'], ['width', '15']]),
      createObject([['tag', 'td'], ['valign', 'top'], ['align', 'left'], ['innerTags', [
        createUserPart()
      ]]])
    ]]])
  ]]]);


  return gamePart;
}