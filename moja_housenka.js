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
var debug = false; //True ak ma vypisovat debug hlasky
var imagesName = new Array ('https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/ZVQkBC2/body.png','https://i.ibb.co/vwp9WJW/food.png','https://i.ibb.co/Nj3scGW/wall.png','https://i.ibb.co/3TYPkpJ/key.png','https://i.ibb.co/Ht6TpSN/door.png','https://i.ibb.co/S0NKgFB/head.png');
var images = new Array('') //Sem sa ulozia nacitane img objekty

myStart()

function myStart() {
    printDebug("Starting game");
    
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
        printDebug("Loading image "+images.length);
        var img = new Image();
        img.src = imagesName[images.length]
        img.onload = function(){
            images.push(img)
            loadResources();  
        }
        
        //Toto mi tu prislo zbytocne, kedze mam referenciu v liste
        //img.style = "display : none";
        //document.body.appendChild(img);
    }
    else
    {
        novaHra();
    }
}


function nastavBarvu(pozice, barva) {
    plocha[pozice] = barva;
    
    printDebug("Changed color of pos "+pozice+" to "+barva+" ")
    
    if(barva ==0)
    {            
        context.fillRect((pozice%xsize)*48, Math.floor(pozice/xsize)*48,48,48);
        context.fillStyle = "#e0e0e0";
        return;
    }
    context.drawImage(images[barva],(pozice%xsize)*48, Math.floor(pozice/xsize)*48,48,48);
}

function stiskKlavesy (e) {
	var udalost = e || window.event;
    
	klavesy[udalost.keyCode] = true;

	if (startuj_hru) {
		rozpohybujHousenku();
		startuj_hru = 0;
		show_result(hlaska);
	}

	var obslouzena = false;
	var klavesa;
    
    //Pridanie podpory pre pohyb pomocou YGHJ
    var keyCode = udalost.keyCode;
    switch(keyCode){
        case 89:
            keyCode = 38;
            break;
        case 72:
            keyCode = 40;
            break;
        case 71:
            keyCode = 37;
            break;
        case 74:
            keyCode = 39;
            break;
    }
    //--
    
	for (klavesa in nastav_smer) {
		if (nastav_smer[klavesa] == keyCode) {
            printDebug("Pressed key "+keyCode)
			if (smer % 2 != klavesa % 2 && povolena_zmena_smeru) {
				smer = klavesa;
				povolena_zmena_smeru = 0;
			}
			obslouzena = true;
		}
    }

	if (udalost.keyCode == 27) {  // esc
		obslouzena = true;
		zastavHru('user');
	} else if (udalost.keyCode == 80) { // P
		obslouzena = true;
		zastavHousenku();
		startuj_hru = 1;
		show_result(pauseMsg);
	}

	return !obslouzena;
}

function printDebug(msg){
    if(debug)
        console.log(msg);
}
