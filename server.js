#!/usr/bin/env node

/**
 * index.html + server.js
 * by Dominik Mikuska
 */

const express = require('express')
const session = require('express-session');
const bodyParser = require('body-parser');
const housenka_class = require('./housenka_server.js')
const WebSocket = require('ws')
const fs = require('fs');

//No Copyright Music - Amadeus Legendary - https://archive.org/details/soundcloud-817541653 - stored on my google drive
const SONG_LINK = 'https://docs.google.com/uc?export=open&id=14t2BJcqWToek8niPG4rxZSODfh4ocmuC';
const NO_USER = "[N/A]";
const ERROR = 'ERROR';
const MAX_LEADERBOARD_COUNT = 10; //Only top 10 players
const PORT = 8080;
const WEBSOCKET_PORT = 8082;

/**
 * Variables
 *
 */
var sessions = []; //Array of active sessions
var users_conn = [];
var users=[]; //array of Users registered
var games=[]; //array of Game played
var leaderboard = [];
var pins = {};

var sessionCheckerTimer; //Timer which periodically checks for expired sessions

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
  constructor(user,score,lvl,sessionID,id) {
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

  ws.on('message', message => {
    let msg = message.split(' ');
    //Pair ws with express
    if (msg[0] === 'CONNECT') {
      let id = connectWsWithExpress(ws, req, msg[1]);
      ws.send('CONNECTED ' + id);
    } else {
      if (msg.length > 1) {

        const game = getGame(msg[1]);
        if (game && !game.started) {
          //Sending links for housenka images
          if (msg[0] === 'GETIMG') {
            ws.send('img ' + msg[1] + ' ' + JSON.stringify(game.housenka.getImagesArr()));
            game.housenka.novaHra();
          } else
              //Client loaded all images, start game
          if (msg[0] === 'READY') {
            const info = updateScore(game, false);
            ws.send('area ' + info + ' ' + JSON.stringify(game.housenka.getArray()));
          }
        }
      }
    }

  })

});

//Check if all session are valid
wss.on('checkSessions', ()=>{
  checkSessions();
})

//Send plocha to all users for update
wss.on('sendArray', (data) => {

  for (let i = 0; i < users_conn.length; i++) {
    const game_info = getGameWithSpectators(users_conn[i][1]);
    let scoreInfo = '-1 -1 -1 -1';
    if (game_info != null) {
      const game = game_info[0];
      const isOwner = game_info[1]; //Check if user is spectating or he is the master of game
      if (game.started) {
        //Update score only for master of game
        if (isOwner) {
          const ended = game.housenka.pohybHousenky();
          scoreInfo = updateScore(game, ended, isOwner);
        }
        else
        {
          //Update only act score to see actual score of spectated game
          scoreInfo = 'unknown' + " " + game.housenka.body + " " + 'unknown' + " " + game.housenka.level;
        }
      }
      //Dont update score labels because the game didnt started
      users_conn[i][0].send('area ' + scoreInfo + ' ' + JSON.stringify(game.housenka.getArray()));
    }
  }

})

function connectWsWithExpress(ws,req,sessionID)
{
  let i;
  let game = null;

  //Check if user is not already connected
  for(let j=0; j<users_conn.length; j++)
  {
    //If user is connected, delete previous game and session
    if(users_conn[j][1] === sessionID){

      for(i = 0; i<games.length; i++) {
        if (games[i].session.sessionID === users_conn[j][1]) {
          pins[games[i].pin] = false;
          games.splice(i,1);
        }
      }
      users_conn.splice(j,1);
      break;
    }
  }

  //Check for sessions which ended and clear them. Reset timer for that
  clearInterval(sessionCheckerTimer);
  sessionCheckerTimer = null;
  sessionCheckerTimer =   setInterval(function(){
    wss.emit('checkSessions');
  }, 2000);

  //Add connection to client list
  users_conn.push([ws, sessionID]);

  //Create game for that session
  for (i = 0; i < sessions.length; i++) {
    if (sessions[i].sessionID === sessionID) {
      game = new Game(sessions[i], getAvailablePin(), [], new housenka_class());
      games.push(game);
      break;
    }
  }

  return sessionID;
}

//Check if sessions are valid and delete the invalid ones
function checkSessions()
{

  for(let k=0; k<users_conn.length; k++)
  {
    if(users_conn[k][0].readyState === 3) //Connection was closed.
    {
      const sessionID = users_conn[k][1];

      //Delete game
      for(let i=0; i<games.length; i++) {
        if (games[i].session.sessionID === sessionID) {
          pins[games[i].pin] = false;
          games.splice(games.indexOf(i),1);
          break;
        }
      }

      //Delete session
      for(let j=0; j<sessions.length; j++)
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

//Send plocha every 250 miliseconds - tick server
setInterval(function(){
  wss.emit('sendArray','MY MESSAGE');
}, 250);

//Check invalid sessions every minute
sessionCheckerTimer = setInterval(function(){
  wss.emit('checkSessions');
}, 60000);


/**
 * Express sessions
 *
 */
const app = express();
app.use("/static", express.static('./static/'));

app.use(session({
  secret: 'housenka',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure:false,
    maxAge: 60*60*24*1000
  }
}));

//Added to read reqeust http data - using it for getting sessionID
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('views', __dirname + '/views');


app.get('/', function(req, res) {
  //Send basic html
  res.sendFile('index.html', { root: app.get('views') })
});

app.post('/register',(req,res)=> {
  //Check if name or email is used
  for(let i =0; i<users.length; i++)
  {
    if(users[i].email === req.body.email || users[i].name === req.body.name)
    {
      res.send(ERROR);
      return;
    }
  }

  //Create and add user
  const user = new User(req.body.email, req.body.name, req.body.password, 0, 1);
  users.push(user);

  res.send('OK');
})

app.post('/login',((req, res) => {
  //Check if user with this credentials exists
  for(let i =0; i<users.length; i++)
  {
    if(users[i].email === req.body.email && users[i].password === req.body.password)
    {
      req.session.email = req.body.email;
      req.session.name = users[i].name;
      for(let j=0; j<sessions.length; j++)
      {
        if(sessions[j].sessionID === req.sessionID)
        {
          sessions[j].user = users[i];
          break;
        }
      }

      //refresh stats
      refreshStats(req.sessionID);

      //If user is admin show admin menu othervise who user menu
      if(req.body.email === 'admin') {
        res.send(createAdminMenu());
      }
      else {
        res.send(createLogout(req.session.name));
      }

      return;
    }
  }

  res.send(ERROR);
}))

app.post('/up',(req,res)=> {
  let game;

  //Check if user is master of game or just spectating
  if(req.body.owner === 'true') {
    game = getGame(req.sessionID);
  }
  else{
    game = getGameWithSpectators(req.sessionID)[0];
  }

  if(game!=null) {
    game.housenka.stiskKlavesy(parseInt(req.body.code));

    //If user connected and is controlling the game too then release key after pressing
    if(req.body.owner === 'false')
      game.housenka.uvolneniKlavesy(parseInt(req.body.code))
  }

  res.end();
})

app.post('/down',(req,res)=> {
  let game;
  //If user is master, release pressed key
  if(req.body.owner === 'true')
    game= getGame(req.sessionID);

  if(game!=null)
    game.housenka.uvolneniKlavesy(parseInt(req.body.code));

  res.end()
})

app.get('/getmenu',(req,res)=> {

  //Check if session already exists
  let is_added = false;
  for(let i=0; i<sessions.length; i++)
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

  //Send html elements
  res.send(createTable(req.sessionID));
})

app.post('/start',(req,res)=> {
  //Unpause game updates
  let game = getGame(req.sessionID);
  if (game) {
    game.started = true;
  }

  res.end();
})

app.post('/pause',(req,res)=> {
  //Pause game updates
  let game = getGame(req.sessionID);
  if(game)
    game.started = false;
  res.end();
})

app.get('/download',function (req,res){
  //Generate filename
  let name = req.sessionID + 0;
  let iter = 1;
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

  //Send file to user
  fs.writeFile(name, JSON.stringify(download), (err) => {
    if (err) {
      throw err;
    }

    res.download(name,'gamesave');

    //Delete file after 60 seconds
    setTimeout(()=>{
      try {
        fs.unlinkSync(name)
      } catch(err) {
        console.error(err)
      }
    },60000)
  });

});

app.post('/upload',function(req,res) {
  //Create new game class
  const h = new housenka_class();
  const result = JSON.parse(req.body['obj']);

  //Set game variables to saved game
  for (const [key, val] of Object.entries(result)) {
    h[key] = val;
  }

  let game = getGame(req.sessionID);
  if (game) {
    game.housenka = h;
  }

  res.end();
});

app.get('/logout',function(req,res){
  //Destroy user info from session after logout
  const session = getSession(req.sessionID);
  if(session)
    session.user = null;

  //Update stats
  refreshStats(req.sessionID);

  res.send(createUserPart());
});

app.get('/leaderboard', function(req,res) {
  //Create json of html table and send to client
  res.send(createLeaderboard());
})

app.get('/activegames',function(req,res) {
  //Create json of html table of active games and send to client
  res.send(createActiveGames(req.sessionID));
})

app.get('/showusers',function(req,res) {
  let session = getSession(req.sessionID);
  if(session && session.user) {
    //Check if user is really logged in as admin
    if (session.user.name === 'admin') {
      res.send(createAdminTable());
      return;
    }
  }

  res.send(ERROR);
})

app.get('/saveusers', function(req,res){
  let session = getSession(req.sessionID);
  if(session && session.user) {
    //Check if user is really logged in as admin
    if (session.user.name === 'admin') {

      //Create name for file
      let name = req.sessionID + 0;
      let iter = 1;
      while (true) {
        try {
          if (fs.existsSync(name)) {
            name = req.sessionID + iter;
            iter++;
          } else
            break;
        } catch (err) {
          console.error(err)
        }
      }
      var download = getUsersData();

      //Save file
      fs.writeFile(name, download, (err) => {
        if (err) {
          throw err;
        }

        //Send file to user
        res.download(name, 'users.csv');

        //Delete file after 60 seconds
        setTimeout(() => {
          try {
            fs.unlinkSync(name)
          } catch (err) {
            console.error(err)
          }
        }, 60000)
      });
    }
  }

})

app.post('/loadusers',function(req,res){
  let session = getSession(req.sessionID);
  if(session && session.user) {
    //Check if user is really logged in as admin
    if (getSession(req.sessionID).user.name === 'admin') {
      const result = req.body['obj'];

      //Load data from incoming csv table
      loadUserData(result);
    }
  }

  res.end();
})

app.post('/connect',function(req,res){
  var pin = req.body.pin;
  var onlyWatching = req.body.watching; //Is false if player can control the game

  var game = getGameWithSpectators(req.sessionID);
  //Check if game exists and pin is right.
  //You cant watch your own game!
  //You cant watch game if someone is watching you already
  if(!game || game[0].pin === pin || !pins[pin])
  {
    console.log("Connection denied");
    res.send(ERROR);
    return;
  }

  if(game[1] === true) {
    //Delete actual game
    pins[game[0].pin] = false;
    games.splice(games.indexOf(game[0]), 1);
  }
  else
  {
    //Disconnect from other game
    game[0].spectators.splice(game[0].spectators.indexOf(getSession(req.headers)),1)
  }

  //Add user as spectator
  for(let i=0; i<games.length; i++)
  {
    if(games[i].pin === pin)
    {
      games[i].spectators.push(getSession(req.sessionID));
      break;
    }
  }

  //Send control button if user can also control the game
  if(onlyWatching === 'true') {
    res.send(createDisconnect(pin))
  }
  else {
    res.send(createControlBtns(pin));
  }
})

app.get('/disconnect',function(req,res) {

  let found = false;
  //Find game which user spectates, delete spectator and create new game
  for(let i=0; i<games.length; i++)
  {
    for(let j=0; j<games[i].spectators.length; j++)
    {
      const array = games[i].spectators;
      if(array[j].sessionID === req.sessionID)
      {
        array.splice(j,1);
        found = true;
        break;
      }
    }
    if(found)
      break;
  }

  const game = new Game(getSession(req.sessionID), getAvailablePin(), [], new housenka_class());
  game.housenka.novaHra();
  games.push(game);

  res.send(getConnectPart());
  refreshStats();

})

app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}`)
})


/**
 * Helper functions
 */

function createRandomID()
{
  return (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
}

//Method used for refreshing score labels and plocha for client
function refreshStats(sessionID)
{
  for(let i=0; i<users_conn.length; i++)
  {
    if(users_conn[i][1] === sessionID) {
      const game = getGame(users_conn[i][1]);
      if (game != null) {
        const scoreInfo = updateScore(game, false);
        users_conn[i][0].send('area ' + scoreInfo + ' ' + JSON.stringify(game.housenka.getArray()));
      }
      break;
    }
  }
}

//Getting of sessionID from "connect.sid=s%3Ag57IbGaNr6yMz4FbOMasXu4PtRtxkT2A.1SEXmdvIBVuPgMH61F0w5bKs8JTsfk1%2BDnjFHIHwexk"
function getSessionID(raw_text)
{
  const raw_cookie = raw_text.split("connect.sid=s%3A");
  return raw_cookie[1].split('.')[0];
}

//Get free pin from array
function getAvailablePin()
{
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
    pin+=i;

    if(!pins[pin])
    {
      pins[pin] = true;
      return pin;
    }
  }

  return null;
}

//Get session object by sessionID
function getSession(sessionID)
{
  for(let i=0; i<sessions.length; i++)
  {
    if(sessions[i].sessionID === sessionID)
      return sessions[i];
  }
}

//Get game object by sessionID
function getGame(sessionID)
{
  for(let i=0; i<games.length; i++)
  {
    if(games[i].session.sessionID === sessionID) {
      return games[i];
    }
  }

  return null;
}

//Get game object by session ID. Checking also sessionIDs in spectators
function getGameWithSpectators(sessionID)
{
  //First parameter is game and second is true if user is master of the game
  for(let i=0; i<games.length; i++)
  {
    const game = games[i];
    if(game.session) {
      if (game.session.sessionID === sessionID) {
        return [game, true];
      }

      for (let j = 0; j < game.spectators.length; j++) {
        if (game.spectators[j].sessionID === sessionID) {
          return [game, false];
        }
      }
    }
  }

  return null;
}

//Update score in session and for user
function updateScore(game,ended) {
  let score = 0;
  let lvl = 1;
  let maxScore = 0;
  let maxLvl = 1;
  let info = '';

  if (game) {
    score = game.housenka.body;
    lvl = game.housenka.level;
  }

  //Get best values from session
  var session = game.session;
  if (session.score < score) {
    session.score = score;
  }
  if (session.level < lvl) {
    session.level = lvl
  }

  //Override user score
  var user = session.user;
  if (user) {
    if (user.score < score) {
      user.score = score;
    }
    if (user.level < lvl) {
      user.level = lvl
    }

    //Find maximum score
    if (session.score > user.score)
      maxScore = session.score;
    else
      maxScore = user.score;

    //Find maximum level
    if (session.level > user.level)
      maxLvl = session.level;
    else
      maxLvl = user.level;

  } else {
    maxScore = session.score;
    maxLvl = session.level;
  }

  info = maxScore + " " + score + " " + maxLvl + " " + lvl;

  //If we just lost health
  if (ended) {
    let name;
    if(user)
      name = user.name;
    else
      name = NO_USER;

    //Try to add agame to leaderboard
    updateLeaderboard(new LeaderboardItem(name,score,lvl));
    game.housenka.koncime();

    //If we are out of lives, restart the game
    if (game.housenka.lives <= 0) {
      game.housenka.restartGame();
    }
  }

  return info;
}

function updateLeaderboard(item)
{
  //If there is less then max count then just add item
  if(leaderboard.length < MAX_LEADERBOARD_COUNT )
  {
    leaderboard.push(item);
    leaderboard.sort((a,b) => (a.score < b.score) ? 1:-1);
    return;
  }

  //If there are more items then add and sort items
  if(leaderboard[leaderboard.length-1].score < item.score)
  {
    leaderboard.push(item);
    leaderboard.sort((a,b) => (a.score < b.score) ? 1:-1);

    if(leaderboard.length > MAX_LEADERBOARD_COUNT)
      leaderboard.splice(leaderboard.indexOf(leaderboard.length-1),1);
  }
}

//This function formats data for csv file
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

//This function parse data from csv
function loadUserData(data)
{
  users = [];
  const users_raw = data.split('\r\n');

  for(let i=1; i<users_raw.length; i++)
  {
    const user_data = users_raw[i].split(',');
    if(user_data.length === 5) {
      users.push(new User(user_data[0],user_data[1],user_data[2],user_data[3],user_data[4]));
    }
  }
}

/**
 * Create and convert HTML to JSON helper functions
 *
 */

//Basic function for creating generic html object to json format
function createObject(params)
{
  var obj = {};
  for(let i=0; i<params.length; i++)
  {
    obj[params[i][0]] = params[i][1];
  }

  return obj;
}

//Create disconnect button for spectating
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

//Create control buttons for game control
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

//Create admin table with active users and games
function getAdminTableData()
{
  const style = createObject([['fontSize', '35px']]);
  var header = createObject([['tag','tr'],['innerTags',[
    createObject([['tag','th'],['width','40%'],['style',style],['innerText','Name']]),
    createObject([['tag','th'],['width','45%'],['style',style],['innerText','Session']]),
    createObject([['tag','th'],['width','15%'],['style',style],['innerText','PIN']])
  ]]]);

  var obj = [header];

  for(let i=0; i<games.length; i++) {

    const item = games[i];
    let name;

    //Check for user name
    if(item.session && item.session.user){
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

//Create admin table
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

//Get data for active games table
function getGamesData(sessionID)
{
  const style = createObject([['fontSize', '35px']]);
  var header = createObject([['tag','tr'],['innerTags',[
    createObject([['tag','th'],['width','30%'],['style',style],['innerText','Game number']]),
    createObject([['tag','th'],['width','40%'],['style',style],['innerText','User']]),
    createObject([['tag','th'],['width','30%'],['style',style]])
  ]]]);

  var obj = [header];

  for(let i=0; i<games.length; i++)
  {
    const item = games[i];
    let connectBtn;
    //You cant watch your game!
    if(item.session.sessionID === sessionID) {
      connectBtn = createObject([['tag','div']]);
    }
    else {
      connectBtn = createButton('Watch game','watchGame',item.pin);
    }

    let username;

    if(item.session.user)
      username = item.session.user.name;
    else
      username = NO_USER;

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

//Create table with active games
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

//Create all parts of admin UI
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

//Create logout part
function createLogout(name)
{
  return createObject([['tag', 'div'], ['id', 'logoutMenu'], ['innerTags', [
    createLabel('Logged in as ' + name, '30px'),
    createObject([['tag', 'br']]),
    createObject([['tag', 'br']]),
    createButton('Logout', 'logout', 'logout')
  ]]]);
}

//Generic create label method
function createLabel(text,size)
{
  const labelStyle = createObject([['fontSize', size]]);
  return createObject([['tag','span'],['innerText',text],['display','inline-block'],['style',labelStyle]]);
}

//Generic create button method
function createButton(text,functionName,id)
{
  const style = createObject([['width', '210px'], ['height', '50px'],['fontSize','23px']]);
  return createObject([['tag', 'button'], ['id',id] ,['innerHTML', text], ['style', style], ['onclick', functionName]]);
}

//Generic create input method for text fields
function createInputField(id)
{
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'text'], ['style', style]]);
}

//Generic create input method for password fields
function createPasswordField(id)
{
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'password'], ['style', style]]);
}

//Generic create input method for upload fields
function createUploadField(id) {
  const style = createObject([['width', '200px'], ['height', '50px'], ['fontSize', '22px']]);
  return createObject([['tag', 'input'], ['id',id] ,['type', 'file'], ['style', style]]);
}

//Generic create label method
function createStatLabel(id)
{
  return createObject([['tag', 'h2'], ['id', id], ['innerHTML', 'randomtext']]);
}

//Get all data for leaderboard table
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

  for(let i=0; i<leaderboard.length; i++)
  {
    const item = leaderboard[i];
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

//Create leaderboard table
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

//Create login and registration part of UI
function createUserPart()
{
  const br = createObject([['tag', 'br']]);

  return createObject([['tag', 'div'], ['id', 'userPart'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Email','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('emailLogin')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Password','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createPasswordField('passwordLogin')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Log in','logIn','passwordBtn')]]]), br,br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Email','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('emailRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Name','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('nameRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createLabel('Password','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createPasswordField('passwordRegistration')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Register','register','registerBtn')]]]), br

  ]]]);
}

//Create connect part of UI
function getConnectPart()
{
  const br = createObject([['tag', 'br']]);

  const connectPart = createObject([['tag','div'],['innerTags',[
    createObject([['tag', 'tr'], ['innerTags', [createLabel('PIN','25px')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createInputField('pin')]]]),br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Connect','connect','connectBtn')]]]),br,br,
    createObject([['tag', 'tr'], ['innerTags', [createUploadField('loadGame')]]]),
    createObject([['tag', 'tr'], ['innerTags', [createButton('Load game', 'loadGame', 'loadBtn')]]]),br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Save game', 'saveGame', 'saveBtn')]]])
  ]]]);

  return connectPart;
}

//Combine and create the whole starting UI
function createTable(id) {
  const br = createObject([['tag', 'br']]);
  const labelStyle = createObject([['fontSize', '35px']]);
  const startBtnStyle = createObject([['width', '210px'], ['height', '50px'], ['fontSize', '23px'], ['background-color', 'green']]);
  var startButton = createObject([['tag', 'button'], ['id', 'statusBtn'], ['innerHTML', 'Start new game'], ['style', startBtnStyle], ['onclick', 'changeGameStatus']]);


  const otherPart = createObject([['tag', 'div'], ['id', 'otherPart'], ['innerTags', [
    createObject([['tag', 'div'], ['id', 'connectPart'], ['innerTags', [getConnectPart()]]]),br,br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Show leaderboard', 'showLeaderboard', 'leaderboardBtn')]]]), br,
    createObject([['tag', 'tr'], ['innerTags', [createButton('Show all games', 'showActiveGames', 'showGamesBtn')]]]), br,
  ]]]);


  const gamePart = createObject([['tag', 'table'], ['id', 'housenka'], ['innerTags', [
    createObject([['tag', 'tr'], ['innerTags', [
      createObject([['tag', 'td'], ['innerTags', [
        createObject([['tag', 'canvas'], ['width', '1968'], ['height', '1488'], ['id', 'canvas']])
      ]]]),
      createObject([['tag', 'td'], ['width', '15']]),
      createObject([['tag', 'td'], ['valign', 'top'], ['align', 'left'], ['innerTags', [
        createButton('Turn on audio', 'changeAudioStatus', 'audioBtn'), br,
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
    ]]]),
    createObject([['tag', 'audio'], ['src', SONG_LINK], ['id', 'audio'], ['loop', 'true']]),
  ]]]);

  const menu = createObject([['tag', 'div'], ['innerTags', [
    createObject([['tag', 'span'], ['id', 'errorLabel'], ['display', 'inline-block'], ['style', labelStyle]]),
      gamePart
  ]]])

  return [menu,id]

}