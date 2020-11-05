const url = 'ws://localhost:8082'
const connection = new WebSocket(url)

connection.onopen = () => {
    console.log("OnOPEN");
    //connection.send("GETIMG") TODO ak chceme zacat hru
}
connection.onerror = error => {
    console.log(`WebSocket error: ${error}`)
}
connection.onmessage = e => {
    console.log(e.data)
    var comm = e.data.split(" ");

    if(comm[0] === 'img') {
        imagesName = JSON.parse(comm[1]);
        housenkaInit();
        loadLabels();
    }
    /*else if (comm[0] ==='test') {
        //TESTING!
    }*/
    else if(comm[0] === 'area') {
        show_new_area(JSON.parse(comm[5]));
        refreshLabels(comm);
    }
}

window.onload = function() {
    loadMenu();
    /*$.post('http://localhost:8080/added',{}, function (data) {
        //console.log("data "+JSON.parse(data));
        console.log(data);
        document.body.innerHTML = JSON.parse(data);

        $.post('http://localhost:8080/added2',{}, function (data2) {
            eval(JSON.parse(data2));
        });

    });*/
};

var logged_in = false;


//Dokopy pozliepate s nahradou md5 kniznice z https://dev.to/nedsoft/a-simple-password-hash-implementation-3hcg TODO zmazat
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






/**
 * Spracovanie dat a interakcia s html
 *
 */
var maxScore = 0;
var score = 0;
var maxLvl = 0;
var lvl = 0;

var maxScoreLabel,maxLvlLabel,lvlLabel,scoreLabel;

function loadLabels()
{
    /*var content = '<h2>Max score is '+maxScore+'<h2/>' +
        '<h2>Max lvl is '+maxLvl+'<h2/>' +
        '<h2>Act score is '+score+'<h2/>' +
        '<h2>Act lvl is '+lvl+'<h2/>';

    var div = document.createElement('div');
    div.innerHTML = content;*/

    var place = document.getElementsByClassName('stav_hry');
    console.log("Place");
    console.log(place);

    maxScoreLabel = document.createElement('h2');
    maxScoreLabel.innerHTML = 'Max score is '+maxScore;
    maxLvlLabel = document.createElement('h2');
    maxLvlLabel.innerHTML = 'Max lvl is '+maxLvl;
    scoreLabel = document.createElement('h2');
    scoreLabel.innerHTML = 'Act score is '+score;
    lvlLabel = document.createElement('h2');
    lvlLabel.innerHTML = 'Act lvl is '+lvl;



    place[0].appendChild(maxScoreLabel);
    place[0].appendChild(maxLvlLabel);
    place[0].appendChild(scoreLabel);
    place[0].appendChild(lvlLabel);
}

function refreshLabels(comm)
{
    //Posielame area maxScore actScore maxLvl actLvl plocha

    maxScore = comm[1];
    score = comm[2];
    maxLvl = comm[3];
    lvl = comm[4];

    maxScoreLabel.innerHTML = 'Max score is '+maxScore;
    maxLvlLabel.innerHTML = 'Max lvl is '+maxLvl;
    scoreLabel.innerHTML = 'Act score is '+score;
    lvlLabel.innerHTML = 'Act lvl is '+lvl;
}

function loadMenu() {
    var emailField = document.createElement("INPUT");
    emailField.type='text';
    document.body.appendChild(emailField);

    document.body.appendChild(document.createElement("BR"));

    var passwordField = document.createElement("INPUT");
    passwordField.type ='password';
    document.body.appendChild(passwordField)

    document.body.appendChild(document.createElement("BR"));

    var register = document.createElement("BUTTON");
    register.innerHTML = "Register";
    register.onclick = function () {
        $.post('http://localhost:8080/register',{
            email: emailField.value,
            password: md5(passwordField.value)
        }, function (data) {
            if(data === "OK") {
                console.log("Registered!");
            }
            else
            {
                console.log("Name is in use");
            }
        });
    }
    document.body.appendChild(register);

    var login = document.createElement("BUTTON");
    login.innerHTML = "Login";
    login.onclick = function () {
        $.post('http://localhost:8080/login',{
            email: emailField.value,
            password: md5(passwordField.value)
        }, function (data) {
            if(data.length > 10){ //TODO WTF
                console.log("Admin logging?");
                //document.body
            }
            else if(data === "OK") {
                console.log("Logged in!");
                connection.send("GETIMG")
            }
            else
            {
                console.log("Wrong combination of pass and email");
            }
        });
    }
    document.body.appendChild(login);

}


/***
 *  HOUSENKA START
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

var context; //Referencia na vykreslovanie
var imagesName;
var images = new Array('') //Sem sa ulozia nacitane img objekty

//Mozno iba treba?
var xsize = 41;
var ysize = 31;
var plocha = new Array();

//Nacitanie html tabulky a canvasu
function housenkaInit () {

    document.write('<table><tr><td valign="top"><table class="housenka" cellspacing="0">');
    document.write('</table></td><td width="10">&nbsp;</td><td valign="top" align="right" class="stav_hry"></table>');

    document.defaultAction = false;
    myStart();
}

function coords (x,y) {
    return y*xsize + x;
}

//Load canvas
function myStart() {
    //Schovanie tabulky
    var el = document.getElementsByClassName("housenka")[0];
    el.style = "display : none";

    //Vytvorenie canvasu
    var canvas = document.createElement("canvas");
    context = canvas.getContext("2d");
    canvas.width = 1968;
    canvas.height = 1488;
    el.parentElement.append(canvas);

    //Nacitanie obrazkov do pola
    loadResources()
}

//Rekurzia, ktora nacita obrazky a nasledne zacne hru
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
        startHry();
    }
}

function nastavBarvu(pozice, barva) {
    plocha[pozice] = barva;

    if(barva ==0)
    {
        context.fillRect((pozice%xsize)*48, Math.floor(pozice/xsize)*48,48,48);
        context.fillStyle = "#e0e0e0";
        return;
    }
    context.drawImage(images[barva],(pozice%xsize)*48, Math.floor(pozice/xsize)*48,48,48);
}

function startHry () {
    //document['onkeydown'] = test_inter;
    document['onkeydown'] = send_keypress;
    document['onkeyup'] = send_keylift;
    connection.send("READY");
}

function show_new_area(area)
{
    for(var i=0;i<area.length;i++)
        nastavBarvu(i,area[i]);
}

function send_keypress(e)
{
    var udalost = e || window.event;
    //console.log("DOWN");
    //connection.send("DOWN "+udalost.keyCode);

    $.post('http://localhost:8080/down',{
        code: udalost.keyCode
    }, function (data) {
        //console.log("Huh?");

    });
}

function send_keylift(e)
{
    var udalost = e || window.event;
    //console.log("UP");
    //connection.send("UP "+udalost.keyCode);

    $.post('http://localhost:8080/up',{
        code: udalost.keyCode
    }, function (data) {
        //console.log("Huh?");

    });
}


