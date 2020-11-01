// Housenka (Nibbles Revival)
// implementoval na Vanoce 2007 Milan Sorm

var klic24Msg = "kľúče";
var ajaxErrorMsg = "Bohužiaľ Váš prehliadač nedokázal na server odoslať dáta cez AJAX, kontaktujte, prosím, prevádzkovateľa systému.";
var live24Msg = "životy";
var klic5Msg = "kľúčov";
var point5Msg = "bodov";
var waitMsg = "Čakajte, prosím, komunikujem so serverom...";
var klic1Msg = "kľúč";
var bludisteMsg = "bludisko";
var accelMsg = "Húsenica prešla už všetkými bludiskami, ktoré sme pre ňu pripravili. Tak to teraz skúsime trochu rýchlejšie, nie?";
var nextLevelMsg = "Húsenica našla cestu do ďalšieho bludiska, ktoré je však oveľa ťažšie. Húsenicu rozbehnete stlačením kurzorovej klávesy.";
var live5Msg = "životov";
var point1Msg = "bod";
var wormFailMsg = "Húsenica nemôže jesť sama seba, našťastie ale máte ďalší život (vraciate sa na začiatok tohto bludiska).";
var keyGotMsg = "Húsenica si naložila kľúč na seba, teraz musí opäť zbierať potravu a&nbsp;zosilnieť, aby uniesla ďalší kľúč.";
var startGameMsg = "Húsenica sa rozbehne stlačením ľubovoľnej kurzorovej klávesy...";
var papejMsg = "Húsenica potrebuje potravu, aby pekne rástla a&nbsp;mohla nájsť kľúče k&nbsp;dverám do ďalšieho bludiska.";
var keyAppearMsg = "Húsenica je dosť silná na zoberanie jedného z&nbsp;kľúčov od dverí k&nbsp;ďalšiemu bludisku, rýchlo pre neho.";
var wallFailMsg = "Náraz do steny húsenicu dosť bolí, našťastie ale máte ďalší život (vraciate sa na začiatok tohto bludiska).";
var point24Msg = "body";
var doorMsg = "Húsenica má už všetky kľúče od dverí do ďalšieho bludiska, ponáhľajme sa teda k&nbsp;nim.";
var live1Msg = "život";
var pauseMsg = "Húsenica chvíľu odpočíva, rozbehnete ju opäť stlačením kurzorovej klávesy.";


var xsize = 41;
var ysize = 31;
var rychlost = 250;
var zradlo_pocatek = 10;
var zradlo_za_klic = 6;
var klicu_v_levelu = 10;
var cena_klice = 5;
var bodu_za_zradlo_orig = 1;
var bodu_za_klic = 10;
var bodu_za_level = 100;
var navysit_zradlo_za_klic = 1;		// prirustek kazdy level
var zrychleni = 0.8;
var levels = pocet_levelu();
var lives = 3;

var level = 1;
var bodu_za_zradlo = bodu_za_zradlo_orig;
var plocha = new Array();
var povolena_zmena_smeru = 1;
var body = 0;
var obsahy = new Array ('prazdne','telicko','zradlo','zed','klic','dvere','hlavicka');
var zradla_k_dispozici = 0;
var telicko = new Array();
var klavesy = new Array();
var smer;		// 0 vpravo, pak po smeru
var timer;
var hlaska = "";
var klicu = 0;
var ulozeno_na_klice = 0;
var klic_na_scene = false;
var dvere_na_scene = false;
var startuj_hru = 1;
var body_na_zacatku_levelu = 0;
var ridkost = false;

//var housenkaURI = location.href;
var housenkaIterator = 0;

var smery = new Array (1,0,0,1,-1,0,0,-1);
var idx_smeru = new Array (0,2,4,6);

var nastav_smer = new Array (39,40,37,38);

var moving = false;

module.exports = {
    getArray,
    stiskKlavesy,
    uvolneniKlavesy,
    novaHra,
    pohybHousenky
}

function getArray()
{
    return plocha;
}

function stiskKlavesy (new_keycode) {

    klavesy[new_keycode] = true;

    if (startuj_hru) {
        rozpohybujHousenku();
        startuj_hru = 0;
    }

    var obslouzena = false;
    var klavesa;
    for (klavesa in nastav_smer)
        if (nastav_smer[klavesa] == new_keycode) {
            if (smer % 2 != klavesa % 2 && povolena_zmena_smeru) {
                smer = klavesa;
                povolena_zmena_smeru = 0;
            }
            obslouzena = true;
        }

    if (new_keycode == 27) {  // esc
        obslouzena = true;
        zastavHru('user');
    } else if (new_keycode == 80) { // P
        obslouzena = true;
        zastavHousenku();
        startuj_hru = 1;
    }

    return !obslouzena;
}

function uvolneniKlavesy (new_keycode) {
    klavesy[new_keycode] = false;
}

function zastavHru (reason) {
    zastavHousenku();
}

function dalsiLevel () {
    ++level;
    body += level*bodu_za_level;
    body_na_zacatku_levelu = body;

    zradlo_za_klic += navysit_zradlo_za_klic;

    hlaska = nextLevelMsg;
    novaHra();

    startuj_hru = 1;
}

function novaHra () {

    for (y=0; y < ysize; y++) {
        for (x=0; x < xsize; x++) {
            plocha[coords(x,y)] = 0;
        }
    }

    console.log("HALO!?");
    zastavHousenku();
    console.log("HALO!?");
    vymazHousenku();
    console.log("HALO!?");
    vymazPlochu();
    console.log("HALO!?");

    klicu = 0;
    bodu_za_zradlo = bodu_za_zradlo_orig;
    ulozeno_na_klice = 0;
    klic_na_scene = false;
    dvere_na_scene = false;
    console.log("HALO!?1");
    var informace = vygenerujLevel();

    smer = informace[0];
    var x = informace[1];
    var y = informace[2];

    var kam = (smer + 2) % idx_smeru.length;
    var p = Number(idx_smeru[kam]);
    var prdylka_x = x + smery[p];
    var prdylka_y = y + smery[p+1];
    console.log("HALO!?2");
    narustHousenky(coords(prdylka_x,prdylka_y),false);
    narustHousenky(coords(x,y),true);
    console.log("HALO!?3");
    doplnZradlo(zradlo_pocatek,-1);

    //TODO odoslat na server novu hru?
    console.log("HALO!?");
}

function vymazPlochu () {
    var i;
    for (i in plocha) nastavBarvu(i,0);
}

function nastavBarvu(pozice, barva) {
    plocha[pozice] = barva;

    //TODO odosli na klienta?
}


function vygenerujDvere (nesmi_byt) {
    var pole = volnePole(nesmi_byt);

    dvere_na_scene = true;
    nastavBarvu(coords(pole[0],pole[1]),5);
    doplnZradlo(zradlo_za_klic,nesmi_byt);
}

function zastavHousenku () {
    /*if (timer) {
        clearTimeout(timer);
        timer = undefined;
    }*/
    moving = false;
}

function narustHousenky (pozice,hlavicka) {
    telicko.unshift(pozice);
    if (hlavicka) nastavBarvu(pozice,6); else nastavBarvu(pozice,1);
}

function rozpohybujHousenku () {
    if (moving) zastavHousenku();
    //timer = setTimeout(pohybHousenky,rychlost);
    moving = true;
}

function volnePole (nesmi_byt) {
    do {
        var x = Math.floor(Math.random() * xsize);
        var y = Math.floor(Math.random() * ysize);
    } while (plocha[coords(x,y)] != 0 || coords(x,y) == nesmi_byt);

    return new Array (x,y);
}

function doplnZradlo (kolik,nesmi_byt) {
    var i;
    console.log("START");
    for (i=0; i<kolik; i++) {
        var pole = volnePole(nesmi_byt);

        nastavBarvu(coords(pole[0],pole[1]),2);
        ++zradla_k_dispozici;
    }
    console.log("END");
}

function vygenerujKlic (nesmi_byt) {
    var pole = volnePole(nesmi_byt);

    nastavBarvu(coords(pole[0],pole[1]),4);
    klic_na_scene = true;
    ulozeno_na_klice -= cena_klice;

    ++bodu_za_zradlo;

    doplnZradlo(zradlo_za_klic,nesmi_byt);
}

function vyresKlice (nesmi_byt) {
    if (klic_na_scene || dvere_na_scene) return;

    if (ulozeno_na_klice >= cena_klice)
        vygenerujKlic(nesmi_byt);
}

function pohybHousenky () {

    if(!moving) return;

    var smer_x = smery[Number(idx_smeru[smer])];
    var smer_y = smery[Number(idx_smeru[smer])+1];

    var hlavicka = reverse_coords(telicko[0]);

    smer_x += hlavicka[0];
    smer_y += hlavicka[1];

    if (smer_x >= xsize) smer_x -= xsize;
    if (smer_y >= ysize) smer_y -= ysize;
    if (smer_x < 0) smer_x += xsize;
    if (smer_y < 0) smer_y += ysize;

    var narust = 0;
    var nova_pozice = coords(smer_x,smer_y);
    if (plocha[nova_pozice] == 2) { // zradlo
        body += bodu_za_zradlo;  ++ulozeno_na_klice;
          vyresKlice(nova_pozice);
        --zradla_k_dispozici;  ++narust;
        nastavBarvu(nova_pozice,0);
    } else if (plocha[nova_pozice] == 4) { // klic
        ++klicu;
        klic_na_scene = false;
        nastavBarvu(nova_pozice,0);

        body += bodu_za_klic;

        ++narust;

        if (klicu == klicu_v_levelu) vygenerujDvere(nova_pozice); else vyresKlice(nova_pozice);
    } else if (plocha[nova_pozice] == 5) { // dvere
        dalsiLevel();
        return;
    }

    if (plocha[nova_pozice] == 0) {
        odbarviHlavu();
        narustHousenky(nova_pozice,true);
        povolena_zmena_smeru = 1;
        if (!narust) nastavBarvu(telicko.pop(),0);
        rozpohybujHousenku();
    } else
    if (plocha[nova_pozice] == 1) koncime('worm');
    else koncime('wall');
}

function koncime (reason) {
    --lives;
    if (lives > 0) {
        body = body_na_zacatku_levelu;
        novaHra();  startuj_hru = 1;
        if (reason == "worm") hlaska = wormFailMsg; else hlaska = wallFailMsg;
    } else
        zastavHru(reason);
}

function odbarviHlavu () {
    nastavBarvu(telicko[0],1);
}

function vymazHousenku () {
    while (telicko.length > 0) nastavBarvu(telicko.pop(),0);
}

function coords (x,y) {
    return y*xsize + x;
}

function reverse_coords (pozice) {
    var x = pozice % xsize;
    var y = Math.floor(pozice / xsize);

    return new Array (x,y);
}
/*
function callFinish () {
    ajax_do_call('finish',finish_result,callFinish.arguments);
}

function ajax_init_object () {
    var ajax;

    try {
        ajax = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            ajax = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (oc) {
            ajax = null;
        }
    }

    if (!ajax && typeof XMLHttpRequest != "undefined") {
        ajax = new XMLHttpRequest();
    }

    return ajax;
}

function ajax_do_call (func_name, callback, args) {
    var post_data, i;

    ++housenkaIterator;
    post_data = "ajax_fce=" + escape(func_name) + ";ajax_iterator=" + housenkaIterator;
    for (i=0; i<args.length; i++) {
        var s = String(args[i]);
        s = s.replace(/\+/g,"%2B");
        post_data += ";ajax_arg=" + encodeURIComponent(s);
    }

    var x = ajax_init_object();
    x.open("POST", housenkaURI, true);
    x.setRequestHeader("Method","POST "+housenkaURI+" HTTP/1.1");
    x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
//	x.setRequestHeader("Connection","close");
    x.onreadystatechange = function () {
        if (x.readyState != 4) return;
        if (x.status == 200) {
            var response = eval("(" + x.responseText + ")");
            if (response.iterator == housenkaIterator) {
                if (!response.error) callback(response.data);
                else {
                    window.alert("Error:\n"+response.errorinfo)
                    show_result(ajaxErrorMsg);
                }
            }
        }
        return;
    }
    x.send(post_data);
    delete x;
}
*/

function zed_poly (useky) {
    var last_x = useky[0];
    var last_y = useky[1];
    var i;
    for (i=2; i < useky.length; i += 2) {
        var x = useky[i];
        var y = useky[i+1];
        zed(last_x,last_y,x,y);
        last_x = x;  last_y = y;
    }
}

function ridka_zed (x1,y1,x2,y2) {
    ridkost = true;
    zed(x1,y1,x2,y2);
    ridkost = false;
}

function zed (x1,y1,x2,y2) {
    var steep = Math.abs(y2-y1) > Math.abs(x2-x1);
    if (steep) { var p = x1;  x1 = y1;  y1 = p;  p = x2;  x2 = y2;  y2 = p; }
    if (x1 > x2) { var p = x1;  x1 = x2;  x2 = p;  p = y1;  y1 = y2;  y2 = p; }

    var dx = x2 - x1;
    var dy = y2 - y1;

    var slope;
    if (dy < 0) {
        slope = -1;
        dy = -dy;
    } else {
        slope = 1;
    }

    var incE = 2 * dy;
    var incNE = 2 * dy - 2 * dx;
    var d = 2 * dy - dx;
    var y = y1;
    var x;
    var ted_jo = true;

    for (x=x1; x <= x2; x++) {
        if (ted_jo) if (steep) cihla(y,x); else cihla(x,y);
        if (d <= 0) d += incE;
        else { d += incNE; y += slope; }
        if (ridkost) ted_jo = !ted_jo;
    }
}

function cihla (x,y) {
    nastavBarvu(coords(x,y),3);
}

function zed_full (x1,y1,x2,y2) {
    if (y1 > y2) { var p = y1;  y1 = y2;  y2 = p; }

    var y;
    for (y=y1; y <= y2; y++) zed(x1,y,x2,y);
}

function vygenerujLevel () {
    var results = new Array (0,0,0);

    var mujlevel = level-1;
    if (mujlevel > levels) {
        mujlevel = mujlevel % levels;
        if (mujlevel == 0) Math.floor(rychlost *= zrychleni);
        if (rychlost < 1) rychlost = 1;
        hlaska = accelMsg;
    }

    results[1] = Math.floor(xsize / 2);
    results[2] = Math.floor(ysize / 2);

    zed_poly(new Array(0,0,xsize-1,0,xsize-1,ysize-1,0,ysize-1,0,0));

    if (mujlevel == 1) {
        zed(Math.floor(xsize/4),Math.floor(ysize/2), Math.floor(3*xsize/4), Math.floor(ysize/2));
        results[2] += 3;
    } else if (mujlevel == 2) {
        zed(Math.floor(xsize/4), 4, Math.floor(xsize/4), ysize-5);
        zed(Math.floor(3*xsize/4), 4, Math.floor(3*xsize/4), ysize-5);
    } else if (mujlevel == 3) {
        zed(4, Math.floor(ysize/2), xsize-5, Math.floor(ysize/2));
        zed(Math.floor(xsize/2), 4, Math.floor(xsize/2), ysize-5);
        results[1] += 5;  results[2] += 5;
    } else if (mujlevel == 4) {
        var x;
        for (x=8; x<xsize; x+=8)
            zed(x,0,x,ysize-7);
        results[0] = 1;
    } else if (mujlevel == 5) {
        var suda = false;
        var x;
        for (x=8; x<xsize; x+=8) {
            if (suda) zed(x,6,x,ysize-1); else zed(x,0,x,ysize-7);
            suda = !suda;
        }
        results[0] = 3;
    } else if (mujlevel == 6) {
        var x;
        for (x=8; x<xsize; x+=8) {
            zed(x,0,x,Math.floor(ysize/2)-3);
            zed(x,Math.floor(ysize/2)+3,x,ysize-1);
        }
    } else if (mujlevel == 7) {
        var suda = false;
        var y;
        for (y=6; y<ysize; y+=6) {
            if (suda) zed(6,y,xsize-1,y); else zed(0,y,xsize-7,y);
            suda = !suda;
        }
    } else if (mujlevel == 8) {
        var y;
        for (y=6; y<ysize; y+=6) {
            zed(0,y,Math.floor(xsize/2)-4,y);
            zed(Math.floor(xsize/2)+4,y,xsize-1,y);
        }
    } else if (mujlevel == 9) {
        zed(Math.floor(xsize/4)+1,6,Math.floor(3*xsize/4)-1,6);
        zed(Math.floor(xsize/4)+1,ysize-7,Math.floor(3*xsize/4)-1,ysize-7);
        zed(Math.floor(xsize/4)-1,8,Math.floor(xsize/4)-1,ysize-9);
        zed(Math.floor(3*xsize/4)+1,8,Math.floor(3*xsize/4)+1,ysize-9);
    } else if (mujlevel == 10) {
        var i;
        for (i=0; i<2; i++) {
            var n = 3*i+1;
            zed(Math.floor(n*xsize/7)+1,6,Math.floor((n+2)*xsize/7)-1,6);
            zed(Math.floor(n*xsize/7)+1,ysize-7,Math.floor((n+2)*xsize/7)-1,ysize-7);
            zed(Math.floor(n*xsize/7)-1,8,Math.floor(n*xsize/7)-1,ysize-9);
            zed(Math.floor((n+2)*xsize/7)+1,8,Math.floor((n+2)*xsize/7)+1,ysize-9);
        }
        results[0] = 1;
    } else if (mujlevel == 11) {
        var i;
        for (i=0; i<2; i++) {
            zed(Math.floor(xsize/4)+1+4*i,6+4*i,Math.floor(3*xsize/4)-1-4*i,6+4*i);
            zed(Math.floor(xsize/4)+1+4*i,ysize-7-4*i,Math.floor(3*xsize/4)-1-4*i,ysize-7-4*i);
            zed(Math.floor(xsize/4)-1+4*i,8+4*i,Math.floor(xsize/4)-1+4*i,ysize-9-4*i);
            zed(Math.floor(3*xsize/4)+1-4*i,8+4*i,Math.floor(3*xsize/4)+1-4*i,ysize-9-4*i);
        }
    } else if (mujlevel == 12) {
        zed(Math.floor(xsize/6),Math.floor(ysize/4),Math.floor(5*xsize/6),Math.floor(3*ysize/4));
        zed(Math.floor(xsize/6),Math.floor(3*ysize/4),Math.floor(5*xsize/6),Math.floor(ysize/4));
        zed_full(Math.floor(xsize/2)-2,Math.floor(ysize/2)-1,Math.floor(xsize/2)+2,Math.floor(ysize/2)+1);
        results[2] += 10;
    } else if (mujlevel == 13) {
        zed(Math.floor(xsize/6),Math.floor(ysize/4),Math.floor(5*xsize/6),Math.floor(3*ysize/4));
        zed(Math.floor(xsize/6),Math.floor(3*ysize/4),Math.floor(5*xsize/6),Math.floor(ysize/4));
        zed(Math.floor(xsize/2),Math.floor(ysize/6),Math.floor(xsize/2),Math.floor(5*ysize/6));
        zed_full(Math.floor(xsize/2)-2,Math.floor(ysize/2)-1,Math.floor(xsize/2)+2,Math.floor(ysize/2)+1);
        results[1] += 5;  results[2] += 10;
    } else if (mujlevel == 14) {
        zed(0,Math.floor(ysize/4),Math.floor(xsize/2),Math.floor(2*ysize/3));
        zed(xsize-1,Math.floor(3*ysize/4),Math.floor(xsize/2),Math.floor(ysize/3));
    } else if (mujlevel == 15) {
        zed(0,Math.floor(ysize/4),Math.floor(xsize/3),Math.floor(2*ysize/3));
        zed(xsize-1,Math.floor(3*ysize/4),Math.floor(2*xsize/3),Math.floor(ysize/3));
        zed(Math.floor(3*xsize/4),0,Math.floor(xsize/3),Math.floor(ysize/3)+1);
        zed(Math.floor(xsize/4),ysize-1,Math.floor(2*xsize/3),Math.floor(2*ysize/3)-1);
        cihla(Math.floor(xsize/4)+3,ysize-2);
        cihla(Math.floor(3*xsize/4)-3,1);
        cihla(1,Math.floor(ysize/4)+2);
        cihla(xsize-2,Math.floor(3*ysize/4)-2);
    } else if (mujlevel == 16) {
        zed(Math.floor(xsize/4)+1,Math.floor(ysize/2)-1,Math.floor(xsize/2)-1,6);
        zed(Math.floor(3*xsize/4)-1,Math.floor(ysize/2)-1,Math.floor(xsize/2)+1,6);
        zed(Math.floor(3*xsize/4)-1,Math.floor(ysize/2)+1,Math.floor(xsize/2)+1,ysize-7);
        zed(Math.floor(xsize/4)+1,Math.floor(ysize/2)+1,Math.floor(xsize/2)-1,ysize-7);
    } else if (mujlevel == 17) {
        ridka_zed(Math.floor(xsize/2),0,Math.floor(xsize/2),ysize-1);
        results[1] += 3;
    } else if (mujlevel == 18) {
        var suda = false;
        var x;
        for (x=8; x<xsize; x+=8) {
            if (suda) ridka_zed(x,0,x,ysize-1); else ridka_zed(x,1,x,ysize-1);
            suda = !suda;
        }
        results[0] = 3;
    } else if (mujlevel == 19) {
        zed(2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
        results[2] += 3;
    } else if (mujlevel == 20) {
        zed(2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
        zed(Math.floor(xsize/2), 2, Math.floor(xsize/2), ysize-3);
        results[1] += 5;  results[2] += 5;
    } else if (mujlevel == 21) {
        zed(2,Math.floor(ysize/2),xsize-3,Math.floor(ysize/2));
        var x;
        for (x=1; x <= 3; x++)
            zed(Math.floor(x*xsize/4), 2, Math.floor(x*xsize/4), ysize-3);
        results[1] += 5;  results[2] += 5;
        results[0] = 1;
    } else if (mujlevel == 22) {
        var suda = false;
        var x;
        for (x=8; x<xsize; x+=8) {
            if (suda) zed(x,2,x,ysize-1); else zed(x,0,x,ysize-3);
            suda = !suda;
        }
        results[0] = 3;
    } else if (mujlevel == 23) {
        var i;
        for (i=0; i<2; i++) {
            var n = 3*i+1;
            zed(Math.floor(n*xsize/7)+1,3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,3+i*Math.floor(ysize/2));
            zed(Math.floor(n*xsize/7)+1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2));
            zed(Math.floor(n*xsize/7)-1,5+i*Math.floor(ysize/2),Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
            zed(Math.floor((n+2)*xsize/7)+1,5+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));

            n = 3*((i+1) % 2) + 1;

            zed(Math.floor(n*xsize/7)+1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)-1,Math.floor(ysize/2)-3+i*Math.floor(ysize/2));
            zed(Math.floor((n+1)*xsize/7)-1,4+i*Math.floor(ysize/2),Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
            zed(Math.floor((n+1)*xsize/7)+1,4+i*Math.floor(ysize/2),Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-5+i*Math.floor(ysize/2));
            cihla(Math.floor(n*xsize/7)-1,Math.floor(ysize/2)-4+i*Math.floor(ysize/2));
            cihla(Math.floor((n+2)*xsize/7)+1,Math.floor(ysize/2)-4+i*Math.floor(ysize/2));
        }
    }

    return results;
}

function pocet_levelu () {
    return 24;
}

