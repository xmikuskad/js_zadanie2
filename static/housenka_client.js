/**
 * housenka_client.js
 * by Dominik Mikuska
 */

const url = 'ws://localhost:8082'
const connection = new WebSocket(url)

const ERROR = 'ERROR';
const AREA_COMMAND = 'area';
const IMAGE_COMMAND = 'img';
const CONNECTED_COMMAND = 'CONNECTED';

var isPlaying = false; //false if game is paused otherwise true
var playingAudio = false;
var ready = false; //Is true after housenka is initalized
var errorTimeout; //timeout checker for error label

/**
 * Websocket communication
 *
 */

connection.onopen = () => {
    //On connection request html UI
    getMenu();
}
connection.onerror = error => {
    console.log(`WebSocket error: ${error}`)
}
connection.onmessage = e => {
    console.log(e.data);
    const comm = e.data.split(" ");

    //Used for getting plocha
    if (ready && comm[0] === AREA_COMMAND) {
        show_new_area(JSON.parse(comm[5]));
        refreshLabels(comm);
    }
    //Used for getting images
    else if (comm[0] === IMAGE_COMMAND) {
        console.log("HELLO??");
        imagesName = JSON.parse(comm[3]);
        loadLabels(comm[2]);
        housenkaInit();
        connection.send("READY " + comm[1]);
    }
    //Called once to establish connection of websocket and express
    else if (comm[0] === CONNECTED_COMMAND) {
        connection.send("GETIMG " + comm[1])
    }
}


/**
 * JQUERY requests
 *
 */

//Get basic menu from server and load it
function getMenu()
{
    $.get('http://localhost:8080/getmenu',{}, function (data) {
        const div = document.getElementById('menu');
        if(div.childElementCount <=0)
            div.appendChild(parseObject(data[0]));
        connection.send('CONNECT '+data[1]);
    });
}

//Log in user. Called after onlick login button
function logIn()
{
    const emailField = document.getElementById('emailLogin');
    const passwordField = document.getElementById('passwordLogin');

    if(emailField.value.length <1)
    {
        showError('Please fill email first',5000);
        return;
    }

    if(passwordField.value.length <1)
    {
        showError('Please fill password first',5000);
        return;
    }

    if(emailField && passwordField) {
        $.post('http://localhost:8080/login', {
            email: emailField.value,
            password: md5(passwordField.value)
        }, function (data) {
            if (data !== ERROR) {
                changeUserPart(data);
            } else {
                showError("Wrong combination of password and email",4000);
            }
        });
    }
}

//Register user. Called after onlick regisster button
function register()
{
    const emailField = document.getElementById('emailRegistration');
    const nameField = document.getElementById('nameRegistration');
    const passwordField = document.getElementById('passwordRegistration');

    //Email regex copied from https://emailregex.com/
    const emailRegex = new RegExp('^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$');
    const nameRegex = new RegExp('^(?=.{5,20}$)[a-zA-Z]+$'); //5-20 characters, a-zA-Z chars allowed
    const passwordRegex = new RegExp('^(?=.{5,20}$)[a-zA-Z*.!@$%^&(){}:;<>,?~_+-=|]+$'); // 5-20 chars, almost all special characters allowed

    //Field checking
    if(nameField.value.length > 20 || nameField.value.length < 5)
    {
        showError('Name has to be between 5 and 20 characters long',5000);
        return;
    }
    if(passwordField.value.length > 20 || passwordField.value.length < 5)
    {
        showError('Password has to be between 5 and 20 characters long',5000);
        return;
    }
    if(!emailRegex.test(emailField.value))
    {
        showError('Invalid formatting of email!',5000);
        return;
    }
    if(!nameRegex.test(nameField.value))
    {
        showError('Name can only contain a-z A-Z characters !',5000);
        return;
    }
    if(!passwordRegex.test(passwordField.value))
    {
        showError('Password contains invalid characters. Allowed characters a-zA-Z*.!@$%^&(){};<>,.?~_+-=|',8000);
        return;
    }


    if(emailField && nameField && passwordField) {
        $.post('http://localhost:8080/register', {
            email: emailField.value,
            name: nameField.value,
            password: md5(passwordField.value)
        }, function (data) {
            if (data === "OK") {
                showError("Registered!",2000);
            } else {
                showError("Account with this name or email is already registered",4000);
            }
        });
    }
}

//Pause game update. Called after onlick pause button
function changeGameStatus() {
    if(isPlaying)
    {
        $.post('http://localhost:8080/pause', {}, function (data) {
            document.getElementById('statusBtn').innerText = 'Unpause game';
        });
    }
    else {
        $.post('http://localhost:8080/start', {}, function (data) {
            document.getElementById('statusBtn').innerText = 'Pause Game';
        });
    }

    isPlaying = !isPlaying;
}

//Log out user. Called after onlick logout button
function logout()
{
    $.get('http://localhost:8080/logout', {
        email: undefined,
        name: undefined,
        password: undefined
    }, function (data) {

        //Delete admin table after logout
        const element = document.getElementById('adminTable');
        if(element) {
            document.body.removeChild(element);
        }

        //Show login and registration
        changeUserPart(data);
    });
}

//Download users info from server. Called after onlick save users button
function saveUsers()
{
    window.location = 'http://localhost:8080/saveusers';
}

//Upload users info to server. Called after onlick load users button
function loadUsers()
{
    const data = document.getElementById('loadUsers');

    //Check if file is chosen
    if(data.files.length <1)
    {
        showError('Choose file first!',5000);
        return;
    }

    var reader = new FileReader();
    reader.onload = function(event) {
        const a = event.target.result;

        $.post('http://localhost:8080/loadusers', {'obj':a}, function (data) {
            console.log('loaded!');
        });
    }
    reader.readAsText(data.files[0]);
}

//Upload game save to server. Called after onlick load game button
function loadGame()
{
    const data = document.getElementById('loadGame');

    //Check if file is chosen
    if(data.files.length <1)
    {
        showError('Choose file first!',5000);
        return;
    }

    var reader = new FileReader();
    reader.onload = function(event) {
        const a = event.target.result;

        $.post('http://localhost:8080/upload', {'obj':a});
    }
    reader.readAsText(data.files[0]);
}

//Download prompt for gamesave. Called after onlick save game button
function saveGame()
{
    window.location = 'http://localhost:8080/download';
}

//Show top 10 players in html table. Called after onlick show leaderboards button
function showLeaderboard() {
    const element = document.getElementById('leaderboard');
    const btn = document.getElementById('leaderboardBtn');

    //If leaderboard is open close it
    if(element){
        document.body.removeChild(element);
        btn.innerText='Show leaderboard';
    }
    //If not then request it
    else
    {
        $.get('http://localhost:8080/leaderboard', {}, function (data) {
            if(data!== ERROR) {
                const obj = parseObject(data);
                document.body.appendChild(obj);
                btn.innerText = 'Hide leaderboard';
            }
            else
            {
                console.error("Error getting leaderboards!");
            }
        });

    }
}

//Show all active games. Called after onlick show all games button
function showActiveGames() {
    const element = document.getElementById('showActiveGames');
    const btn = document.getElementById('showGamesBtn');

    //If active games are shown close then
    if(element){
        document.body.removeChild(element);
        btn.innerText='Show all games';
    }
    //If not request them
    else
    {
        $.get('http://localhost:8080/activegames', {}, function (data) {
            if(data!== ERROR) {
                const obj = parseObject(data);
                document.body.appendChild(obj);
                btn.innerText = 'Hide all games';
            }
        });

    }
}

//Show all active users for admin. Called after onlick show users button
function showUsers(){
    const element = document.getElementById('adminTable');
    const btn = document.getElementById('showUsersBtn');

    //If table is shown then hide it
    if(element) {
        document.body.removeChild(element);
        btn.innerText='Show users';
    }
    //If not then request it
    else {
        $.get('http://localhost:8080/showusers', {}, function (data) {
            if(data !== ERROR) {
                const obj = parseObject(data);
                document.body.appendChild(obj);
                btn.innerText = 'Hide users';
            }
        });
    }
}

//Start spectating player. Called after onlick watch game button in table
function watchGame(event)
{
    connect(event.target.id);
}

//Start spectating player or controlling game. Called after onlick connect button
function connect(pinInc)
{
    let watching, pin;

    const startBtn = document.getElementById('statusBtn');
    const place = document.getElementById('connectPart');

    //pinInc is string if we are watching. If we want to control then it is object
    if(typeof(pinInc) === 'object') {
        watching = false;
        const input = document.getElementById('pin');
        const regex = RegExp('^[0-9]{4}$');

        //Check if pin is in right form
        if(!regex.test(input.value))
        {
            showError('Please enter pin for connection in right form. Example: 0000',7000);
            return;
        }

        pin = input.value;
    }
    else {
        watching = true;
        pin = pinInc;
    }

    $.post('http://localhost:8080/connect', {
        pin: pin,
        watching: watching
    }, function (data) {
        console.log('DATA TYPE '+typeof(data));
        if(typeof(data) !== 'string') {
            startBtn.style.display = 'none';
            while (place.firstChild) {
                place.removeChild(place.lastChild);
            }
            place.appendChild(parseObject(data));
        }
    });
}

//Stop spectating player or controlling game. Called after onlick disconnect button
function disconnect()
{
    const place = document.getElementById('connectPart');
    const startBtn = document.getElementById('statusBtn');

    $.get('http://localhost:8080/disconnect', {}, function (data) {
        startBtn.style.display = null;
        startBtn.innerText = 'Start new game';

        while(place.firstChild)
        {
            place.removeChild(place.lastChild);
        }

        place.appendChild(parseObject(data));
    });

}

//Send movement data if you are connected to game. Called after onlick up/left/right/down buttons
function spectatorMove(event)
{
    $.post('http://localhost:8080/up',{
        code: event.target.id,
        owner: false
    }, function (data) {});
}

/**
 * Data processing and parsing of html elements
 *
 */
var maxScore = 0;
var score = 0;
var maxLvl = 1;
var lvl = 1;
var maxScoreLabel,maxLvlLabel,lvlLabel,scoreLabel;

// Tu je spomenute, ze kniznica je free to use https://stackoverflow.com/questions/1655769/fastest-md5-implementation-in-javascript
//  A formatted version of a popular md5 implementation.
//  Original copyright (c) Paul Johnston & Greg Holt.
//  The function itself is now 42 lines long.
function md5(inputString) {
    var hc="0123456789abcdef";
    function rh(n) {var j,s="";for(j=0;j<=3;j++) s+=hc.charAt((n>>(j*8+4))&0x0F)+hc.charAt((n>>(j*8))&0x0F);return s;}
    function ad(x,y) {var l=(x&0xFFFF)+(y&0xFFFF);var m=(x>>16)+(y>>16)+(l>>16);return (m<<16)|(l&0xFFFF);}
    function rl(n,c)            {return (n<<c)|(n>>>(32-c));}
    function cm(q,a,b,x,s,t)    {return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t)  {return cm((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t)  {return cm((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t)  {return cm(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t)  {return cm(c^(b|(~d)),a,b,x,s,t);}
    function sb(x) {
        var i;var nblk=((x.length+8)>>6)+1;var blks=new Array(nblk*16);for(i=0;i<nblk*16;i++) blks[i]=0;
        for(i=0;i<x.length;i++) blks[i>>2]|=x.charCodeAt(i)<<((i%4)*8);
        blks[i>>2]|=0x80<<((i%4)*8);blks[nblk*16-2]=x.length*8;return blks;
    }
    var i,x=sb(inputString),a=1732584193,b=-271733879,c=-1732584194,d=271733878,olda,oldb,oldc,oldd;
    for(i=0;i<x.length;i+=16) {olda=a;oldb=b;oldc=c;oldd=d;
        a=ff(a,b,c,d,x[i+ 0], 7, -680876936);d=ff(d,a,b,c,x[i+ 1],12, -389564586);c=ff(c,d,a,b,x[i+ 2],17,  606105819);
        b=ff(b,c,d,a,x[i+ 3],22,-1044525330);a=ff(a,b,c,d,x[i+ 4], 7, -176418897);d=ff(d,a,b,c,x[i+ 5],12, 1200080426);
        c=ff(c,d,a,b,x[i+ 6],17,-1473231341);b=ff(b,c,d,a,x[i+ 7],22,  -45705983);a=ff(a,b,c,d,x[i+ 8], 7, 1770035416);
        d=ff(d,a,b,c,x[i+ 9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,     -42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
        a=ff(a,b,c,d,x[i+12], 7, 1804603682);d=ff(d,a,b,c,x[i+13],12,  -40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);
        b=ff(b,c,d,a,x[i+15],22, 1236535329);a=gg(a,b,c,d,x[i+ 1], 5, -165796510);d=gg(d,a,b,c,x[i+ 6], 9,-1069501632);
        c=gg(c,d,a,b,x[i+11],14,  643717713);b=gg(b,c,d,a,x[i+ 0],20, -373897302);a=gg(a,b,c,d,x[i+ 5], 5, -701558691);
        d=gg(d,a,b,c,x[i+10], 9,   38016083);c=gg(c,d,a,b,x[i+15],14, -660478335);b=gg(b,c,d,a,x[i+ 4],20, -405537848);
        a=gg(a,b,c,d,x[i+ 9], 5,  568446438);d=gg(d,a,b,c,x[i+14], 9,-1019803690);c=gg(c,d,a,b,x[i+ 3],14, -187363961);
        b=gg(b,c,d,a,x[i+ 8],20, 1163531501);a=gg(a,b,c,d,x[i+13], 5,-1444681467);d=gg(d,a,b,c,x[i+ 2], 9,  -51403784);
        c=gg(c,d,a,b,x[i+ 7],14, 1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+ 5], 4,    -378558);
        d=hh(d,a,b,c,x[i+ 8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16, 1839030562);b=hh(b,c,d,a,x[i+14],23,  -35309556);
        a=hh(a,b,c,d,x[i+ 1], 4,-1530992060);d=hh(d,a,b,c,x[i+ 4],11, 1272893353);c=hh(c,d,a,b,x[i+ 7],16, -155497632);
        b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13], 4,  681279174);d=hh(d,a,b,c,x[i+ 0],11, -358537222);
        c=hh(c,d,a,b,x[i+ 3],16, -722521979);b=hh(b,c,d,a,x[i+ 6],23,   76029189);a=hh(a,b,c,d,x[i+ 9], 4, -640364487);
        d=hh(d,a,b,c,x[i+12],11, -421815835);c=hh(c,d,a,b,x[i+15],16,  530742520);b=hh(b,c,d,a,x[i+ 2],23, -995338651);
        a=ii(a,b,c,d,x[i+ 0], 6, -198630844);d=ii(d,a,b,c,x[i+ 7],10, 1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);
        b=ii(b,c,d,a,x[i+ 5],21,  -57434055);a=ii(a,b,c,d,x[i+12], 6, 1700485571);d=ii(d,a,b,c,x[i+ 3],10,-1894986606);
        c=ii(c,d,a,b,x[i+10],15,   -1051523);b=ii(b,c,d,a,x[i+ 1],21,-2054922799);a=ii(a,b,c,d,x[i+ 8], 6, 1873313359);
        d=ii(d,a,b,c,x[i+15],10,  -30611744);c=ii(c,d,a,b,x[i+ 6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21, 1309151649);
        a=ii(a,b,c,d,x[i+ 4], 6, -145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+ 2],15,  718787259);
        b=ii(b,c,d,a,x[i+ 9],21, -343485551);a=ad(a,olda);b=ad(b,oldb);c=ad(c,oldc);d=ad(d,oldd);
    }
    return rh(a)+rh(b)+rh(c)+rh(d);
}

//Clear login and registration and append logout with admin UI
//Clear logout and append login and registration
function changeUserPart(newObj)
{
    const userDiv = document.getElementById('userPart');

    while(userDiv.firstChild)
        userDiv.removeChild(userDiv.lastChild);

    userDiv.appendChild(parseObject(newObj));
}

//Turn audio on/off. Called after onlick turn on audio button
function changeAudioStatus()
{
    const audio = document.getElementById('audio');
    const btn = document.getElementById('audioBtn');

    if(playingAudio){
        audio.pause();
        btn.innerText = 'Turn on audio';
    }
    else
    {
        audio.play();
        btn.innerText = 'Turn off audio';
    }

    playingAudio = !playingAudio;
}

//Show error label on the top for selected time
function showError(text,time) {
    const label = document.getElementById('errorLabel');
    label.innerText = text;

    if(errorTimeout)
        clearTimeout(errorTimeout);
    clearError(time);
}
function clearError(time)
{
    errorTimeout = setTimeout(()=>{
        const label = document.getElementById('errorLabel');
        label.innerText = '';
    },time);
}

//Initialize labels variables
function loadLabels(pin)
{
    if(pin)
    {
        const pinLabel = document.getElementById('pinText');
        if(pinLabel)
            pinLabel.innerText = 'Your pin is '+pin;
    }

    maxScoreLabel = document.getElementById('maxScoreLabel');
    if(maxScoreLabel)
        maxScoreLabel.innerHTML = 'Max score is '+maxScore;

    maxLvlLabel = document.getElementById('maxLvlLabel');
    if(maxLvlLabel)
        maxLvlLabel.innerHTML = 'Max lvl is '+maxLvl;

    scoreLabel = document.getElementById('scoreLabel');
    if(scoreLabel)
        scoreLabel.innerHTML = 'Act score is '+score;

    lvlLabel = document.getElementById('lvlLabel');
    if(lvlLabel)
        lvlLabel.innerHTML = 'Act lvl is '+lvl;
}

//Load new data into labels
function refreshLabels(comm)
{
    //Comm contains: "area maxScore actScore maxLvl actLvl plocha" split by ' '
    maxScore = comm[1];
    score = comm[2];
    maxLvl = comm[3];
    lvl = comm[4];

    //Dont update labels if -1
    if(maxScore < 0)
        return;

    if(maxScore !== 'unknown') {
        maxScoreLabel.innerHTML = 'Max score is ' + maxScore;
    }
    else
    {
        maxScoreLabel.innerHTML = '';
    }

    if(maxLvl !== 'unknown') {
        maxLvlLabel.innerHTML = 'Max lvl is ' + maxLvl;
    }
    else
        maxLvlLabel.innerHTML ='';

    if(score !== 'unknown') {
        scoreLabel.innerHTML = 'Act score is ' + score;
    }
    else
    {
        scoreLabel.innerHTML = '';
    }

    if(lvl !== 'unknown') {
        lvlLabel.innerHTML = 'Act lvl is ' + lvl;
    }
    else
    {
        lvlLabel.innerHTML = '';
    }
}

//This function is parsing json to html object
function parseObject(obj)
{
    let htmlObj = {};
    if(obj.tag)
    {
        htmlObj = document.createElement(obj.tag);
        for (const [key, val] of Object.entries(obj)) {

            switch (key)
            {
                case 'innerTags':
                    for (let i = 0; i < val.length; i++) {
                        htmlObj.appendChild(parseObject(val[i]))
                    }
                    break;
                case 'style':
                    for (const [key1, val1] of Object.entries(obj[key])) {
                        htmlObj[key][key1] = val1;
                    }
                    break;
                case 'onclick':
                    htmlObj[key] = this[val];
                    break;
                default:
                    htmlObj[key] = val;
                    break;
            }
        }
    }
    return htmlObj;
}

/***
 *  HOUSENKA CLIENT CODE
 *
 */

/*
LICENCIE PRE OBRAZKY:

body.png, wall.png, door.png:
Zdroj: https://kenney.nl/assets/platformer-kit
Licencia CC0: https://creativecommons.org/publicdomain/zero/1.0/

key.png
Zdroj: https://pixabay.com/vectors/animation-cartoon-key-lock-2423363/
Licencia PIXABAY: https://pixabay.com/service/license/

food.png
Zdroj: https://pixabay.com/vectors/goldfish-fish-koi-carp-30837/
Licencia PIXABAY: https://pixabay.com/service/license/

head.png
Zdroj:https://pixabay.com/vectors/tiger-head-grin-cartoon-orange-308768/
Licencia PIXABAY: https://pixabay.com/service/license/
*/

var context; //Reference for canvas drawin
var imagesName;
var images = new Array('') //Loaded img objects
var xsize = 41;


//Load canvas
function housenkaInit() {
    document.defaultAction = false;

    var canvas = document.getElementById('canvas');
    context = canvas.getContext("2d");

    //Load images to array
    loadResources()
}

//Load all images and then start game
function loadResources(){
    if(images.length <7)
    {
        var img = new Image();
        img.src = imagesName[images.length]
        img.onload = function(){
            images.push(img)
            loadResources();
        }
    }
    else
    {
        startGame();
    }
}

//Set color in canvas
function setColor(position, color) {
    if(color ===0)
    {
        context.fillRect((position%xsize)*48, Math.floor(position/xsize)*48,48,48);
        context.fillStyle = "#e0e0e0";
        return;
    }
    context.drawImage(images[color],(position%xsize)*48, Math.floor(position/xsize)*48,48,48);
}

function startGame () {
    document['onkeydown'] = send_keypress;
    document['onkeyup'] = send_keylift;
    ready = true;
}

function show_new_area(area)
{
    for(var i=0;i<area.length;i++) {
        setColor(i, area[i]);
    }
}

function send_keypress(e)
{
    var event = e || window.event;

    $.post('http://localhost:8080/down',{
        code: event.keyCode,
        owner: true
    });
}

function send_keylift(e)
{
    var event = e || window.event;

    $.post('http://localhost:8080/up',{
        code: event.keyCode,
        owner: true
    });
}