/*var context; //Referencia na vykreslovanie
var debug = false; //True ak ma vypisovat debug hlasky
var imagesName = new Array ('https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/vwp9WJW/food.png','https://i.ibb.co/Nj3scGW/wall.png','https://i.ibb.co/3TYPkpJ/key.png','https://i.ibb.co/Ht6TpSN/door.png','https://i.ibb.co/S0NKgFB/head.png');
var images = new Array('') //Sem sa ulozia nacitane img objekty

init()

function init() {

}*/
/*
let socket = new WebSocket("ws://localhost:8082");

socket.onopen = function(e) {
    alert("[open] Connection established");
    alert("Sending to server");
    socket.send("My name is John");
};

socket.onmessage = function(event) {
    alert(`[message] Data received from server: ${event.data}`);
};

socket.onclose = function(event) {
    if (event.wasClean) {
        alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        alert('[close] Connection died');
    }
};

socket.onerror = function(error) {
    alert(`[error] ${error.message}`);
};*/


console.log("CONSOLE!");

const url = 'ws://localhost:8082'
const connection = new WebSocket(url)

connection.onopen = () => {
    console.log("OnOPEN");
    //connection.send('hey')
}
connection.onerror = error => {
    console.log(`WebSocket error: ${error}`)
}
connection.onmessage = e => {
    //console.log("OnMsg");
    console.log(e.data)
    show_new_area(JSON.parse(e.data));
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
var imagesName = new Array ('https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/vwp9WJW/food.png','https://i.ibb.co/Nj3scGW/wall.png','https://i.ibb.co/3TYPkpJ/key.png','https://i.ibb.co/Ht6TpSN/door.png','https://i.ibb.co/S0NKgFB/head.png');
var images = new Array('') //Sem sa ulozia nacitane img objekty

//Mozno iba treba?
var xsize = 41;
var ysize = 31;
var plocha = new Array();

housenkaInit();

//Nacitanie html tabulky a canvasu
function housenkaInit () {
    var x,y;

    document.write('<style> table.housenka { border: solid black 1px; } table.housenka td { padding: 0px; border: none; width: 13px; height: 13px; font-size: 3px; } table.housenka td.prazdne { } table.housenka td.telicko { background-color: green; } table.housenka td.zradlo { background-color: cyan; } table.housenka td.zed { background-color: black; } table.housenka td.klic { background-color: red; } td.stav_hry table tr td span { font-size: 10pt; } table.housenka td.dvere { background-color: maroon; } table.housenka td.hlavicka { background-color: blue; } </style>');
    document.write('<table><tr><td valign="top"><table class="housenka" cellspacing="0">');
    for (y=0; y < ysize; y++) {
        document.write('<tr>');
        for (x=0; x < xsize; x++) {
            plocha[coords(x,y)] = 0;
            document.write('<td id="pole-' + coords(x,y) + '">&nbsp;</td>');
        }
        document.write('</tr>');
    }
    document.write('</table></td><td width="10">&nbsp;</td><td valign="top" align="right" class="stav_hry"><table><tr><td align="right"><span id="uroven"></span></td><td align="left"><span id="uroven_text"></td></tr><tr><td align="right"><span id="zivoty"></span></td><td align="left"><span id="zivoty_text"></td></tr><tr><td align="right"><span id="klice"></span></td><td align="left"><span id="klice_text"></span></td></tr><tr><td align="right"><span id="bodovani"></span></td><td align="left"><span id="bodovani_text"></span></td></tr></table></td></tr></table><p align="left" id="result"></p>');

    //novaHra(); TODO SERVER - treba to vobec ?
    window.onload = function () { myStart() }
    document.defaultAction = false;
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

//TODO posielanie na server
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
    console.log("DOWN");
    connection.send("DOWN "+udalost.keyCode);
}

function send_keylift(e)
{
    var udalost = e || window.event;
    console.log("UP");
    connection.send("UP "+udalost.keyCode);
}


