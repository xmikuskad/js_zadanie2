// Housenka (Nibbles Revival)
// implementoval na Vanoce 2007 Milan Sorm
// this functions are from Milan Sorm https://is.stuba.sk/js/herna/housenka.js
class Housenka {

    constructor() {
        //Reupload
        //this.imagesName = ['https://i.ibb.co/ZVQkBC2/body.png', 'https://i.ibb.co/ZVQkBC2/body.png', 'https://i.ibb.co/vwp9WJW/food.png', 'https://i.ibb.co/Nj3scGW/wall.png', 'https://i.ibb.co/3TYPkpJ/key.png', 'https://i.ibb.co/Ht6TpSN/door.png', 'https://i.ibb.co/S0NKgFB/head.png'];
        this.imagesName = ['https://i.imgur.com/XDNhJgC.png', 'https://i.imgur.com/XDNhJgC.png',  'https://i.imgur.com/YB2yi8z.png', 'https://i.imgur.com/8cFmhlS.png', 'https://i.imgur.com/80MByJd.png', 'https://i.imgur.com/jis5Ayx.png', 'https://i.imgur.com/68lGrA7.png'];

        this.xsize = 41;
        this.ysize = 31;
        this.rychlost = 250;
        this.zradlo_pocatek = 10;
        this.zradlo_za_klic = 6;
        this.klicu_v_levelu = 10;
        this.cena_klice = 5;
        this.bodu_za_zradlo_orig = 1;
        this.bodu_za_klic = 10;
        this.bodu_za_level = 100;
        this.navysit_zradlo_za_klic = 1;		// prirustek kazdy level
        this.zrychleni = 0.8;
        this.levels = 24
        this.lives = 3;

        this.level = 1;
        this.bodu_za_zradlo = this.bodu_za_zradlo_orig;
        this.plocha = [];
        this.povolena_zmena_smeru = 1;
        this.body = 0;
        this.zradla_k_dispozici = 0;
        this.telicko = [];
        this.klavesy = [];
        this.smer;		// 0 vpravo, pak po smeru
        this.klicu = 0;
        this.ulozeno_na_klice = 0;
        this.klic_na_scene = false;
        this.dvere_na_scene = false;
        this.startuj_hru = 1;
        this.body_na_zacatku_levelu = 0;
        this.ridkost = false;

        this.smery = [1, 0, 0, 1, -1, 0, 0, -1];
        this.idx_smeru = [0, 2, 4, 6];

        this.nastav_smer = [39, 40, 37, 38];

        this.moving = false;
    }

    getImagesArr() {
        return this.imagesName;
    }

    getArray() {
        return this.plocha;
    }

    zastavHousenku() {
        this.moving = false;
    }

    stiskKlavesy(new_keycode) {
        this.klavesy[new_keycode] = true;

        if (this.startuj_hru) {
            this.rozpohybujHousenku();
            this.startuj_hru = 0;
        }

        var obslouzena = false;
        var klavesa;
        for (klavesa in this.nastav_smer)
            if (this.nastav_smer[klavesa] === new_keycode) {
                if (this.smer % 2 != klavesa % 2 && this.povolena_zmena_smeru) {
                    this.smer = klavesa;
                    this.povolena_zmena_smeru = 0;
                }
                obslouzena = true;
            }

        if (new_keycode === 27) {  // esc
            obslouzena = true;
            this.zastavHru('user');
        } else if (new_keycode === 80) { // P
            obslouzena = true;
            this.zastavHousenku();
            this.startuj_hru = 1;
        }

        return !obslouzena;
    }

    uvolneniKlavesy(new_keycode) {
        this.klavesy[new_keycode] = false;
    }

    zastavHru(reason) {
        this.zastavHousenku();
    }

    dalsiLevel() {
        this.level+=1;
        this.body += this.level * this.bodu_za_level;
        this.body_na_zacatku_levelu = this.body;

        this.zradlo_za_klic += this.navysit_zradlo_za_klic;

        this.novaHra();

        this.startuj_hru = 1;
    }


    //ADDED!
    restartGame(){
        this.body = 0;
        this.level = 1;
        this.lives = 3;

        this.novaHra();

        this.startuj_hru = 1;
    }

    novaHra() {

        for (var y = 0; y < this.ysize; y++) {
            for (var x = 0; x < this.xsize; x++) {
                this.plocha[this.coords(x, y)] = 0;
            }
        }
        this.zastavHousenku();
        this.vymazHousenku();
        this.vymazPlochu();

        this.klicu = 0;
        this.bodu_za_zradlo = this.bodu_za_zradlo_orig;
        this.ulozeno_na_klice = 0;
        this.klic_na_scene = false;
        this.dvere_na_scene = false;
        var informace = this.vygenerujLevel();
        this.smer = informace[0];
        x = informace[1];
        y = informace[2];
        var kam = (this.smer + 2) % this.idx_smeru.length;
        var p = Number(this.idx_smeru[kam]);
        var prdylka_x = x + this.smery[p];
        var prdylka_y = y + this.smery[p + 1];
        this.narustHousenky(this.coords(prdylka_x, prdylka_y), false);
        this.narustHousenky(this.coords(x, y), true);
        this.doplnZradlo(this.zradlo_pocatek, -1);
    }

    vymazPlochu() {
        var i;
        for (i in this.plocha) this.nastavBarvu(i, 0);
    }

    nastavBarvu(pozice, barva) {
        this.plocha[pozice] = barva;

        //TODO odosli na klienta?
    }


    vygenerujDvere(nesmi_byt) {
        var pole = this.volnePole(nesmi_byt);

        this.dvere_na_scene = true;
        this.nastavBarvu(this.coords(pole[0], pole[1]), 5);
        this.doplnZradlo(this.zradlo_za_klic, nesmi_byt);
    }


    narustHousenky(pozice, hlavicka) {
        (this.telicko).unshift(pozice);
        if (hlavicka) this.nastavBarvu(pozice, 6); else this.nastavBarvu(pozice, 1);
    }

    rozpohybujHousenku() {
        if (this.moving) this.zastavHousenku();
        this.moving = true;
    }

    volnePole(nesmi_byt) {
        do {
            var x = Math.floor(Math.random() * this.xsize);
            var y = Math.floor(Math.random() * this.ysize);
        } while (this.plocha[this.coords(x, y)] != 0 || this.coords(x, y) == nesmi_byt);

        return [x, y];
    }

    doplnZradlo(kolik, nesmi_byt) {
        var i;
        for (i = 0; i < kolik; i++) {
            var pole = this.volnePole(nesmi_byt);

            this.nastavBarvu(this.coords(pole[0], pole[1]), 2);
            ++(this.zradla_k_dispozici);
        }
    }

    vygenerujKlic(nesmi_byt) {
        var pole = this.volnePole(nesmi_byt);

        this.nastavBarvu(this.coords(pole[0], pole[1]), 4);
        this.klic_na_scene = true;
        this.ulozeno_na_klice -= this.cena_klice;

        ++this.bodu_za_zradlo;

        this.doplnZradlo(this.zradlo_za_klic, nesmi_byt);
    }

    vyresKlice(nesmi_byt) {
        if (this.klic_na_scene || this.dvere_na_scene) return;

        if (this.ulozeno_na_klice >= this.cena_klice)
            this.vygenerujKlic(nesmi_byt);
    }

    pohybHousenky() {

        if (!this.moving) return;

        var smer_x = this.smery[Number(this.idx_smeru[this.smer])];
        var smer_y = this.smery[Number(this.idx_smeru[this.smer]) + 1];

        var hlavicka = this.reverse_coords(this.telicko[0]);

        smer_x += hlavicka[0];
        smer_y += hlavicka[1];

        if (smer_x >= this.xsize) smer_x -= this.xsize;
        if (smer_y >= this.ysize) smer_y -= this.ysize;
        if (smer_x < 0) smer_x += this.xsize;
        if (smer_y < 0) smer_y += this.ysize;

        var narust = 0;
        var nova_pozice = this.coords(smer_x, smer_y);
        if (this.plocha[nova_pozice] == 2) { // zradlo
            this.body += this.bodu_za_zradlo;
            ++this.ulozeno_na_klice;
            this.vyresKlice(nova_pozice);
            --this.zradla_k_dispozici;
            ++narust;
            this.nastavBarvu(nova_pozice, 0);
        } else if (this.plocha[nova_pozice] == 4) { // klic
            ++this.klicu;
            this.klic_na_scene = false;
            this.nastavBarvu(nova_pozice, 0);

            this.body += this.bodu_za_klic;

            ++narust;

            if (this.klicu == this.klicu_v_levelu) this.vygenerujDvere(nova_pozice); else this.vyresKlice(nova_pozice);
        } else if (this.plocha[nova_pozice] == 5) { // dvere
            this.dalsiLevel();
            return;
        }

        if (this.plocha[nova_pozice] == 0) {
            this.odbarviHlavu();
            this.narustHousenky(nova_pozice, true);
            this.povolena_zmena_smeru = 1;
            if (!narust) this.nastavBarvu(this.telicko.pop(), 0);
            this.rozpohybujHousenku();
        } else if (this.plocha[nova_pozice] == 1) {
            //this.koncime('worm');
            return true;
        }
        else {
            //this.koncime('wall');
            return true;
        }
        return false;
    }

    koncime(reason) {
        --this.lives;
        if (this.lives > 0) {
            this.body = this.body_na_zacatku_levelu;
            this.novaHra();
            this.startuj_hru = 1;
        } else
            this.zastavHru(reason);
    }

    odbarviHlavu() {
        this.nastavBarvu(this.telicko[0], 1);
    }

    vymazHousenku() {
        while (this.telicko.length > 0) this.nastavBarvu(this.telicko.pop(), 0);
    }

    coords(x, y) {
        return y * this.xsize + x;
    }

    reverse_coords(pozice) {
        var x = pozice % this.xsize;
        var y = Math.floor(pozice / this.xsize);

        return [x, y];
    }

    /*
    callFinish () {
        ajax_do_call('finish',finish_result,callFinish.arguments);
    }

    ajax_init_object () {
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

    ajax_do_call (func_name, callback, args) {
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
        x.onreadystatechange = () {
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

    zed_poly(useky) {
        var last_x = useky[0];
        var last_y = useky[1];
        var i;
        for (i = 2; i < useky.length; i += 2) {
            var x = useky[i];
            var y = useky[i + 1];
            this.zed(last_x, last_y, x, y);
            last_x = x;
            last_y = y;
        }
    }

    ridka_zed(x1, y1, x2, y2) {
        this.ridkost = true;
        this.zed(x1, y1, x2, y2);
        this.ridkost = false;
    }

    zed(x1, y1, x2, y2) {
        var steep = Math.abs(y2 - y1) > Math.abs(x2 - x1);
        if (steep) {
            var p = x1;
            x1 = y1;
            y1 = p;
            p = x2;
            x2 = y2;
            y2 = p;
        }
        if (x1 > x2) {
            var p = x1;
            x1 = x2;
            x2 = p;
            p = y1;
            y1 = y2;
            y2 = p;
        }

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

        for (x = x1; x <= x2; x++) {
            if (ted_jo) if (steep) this.cihla(y, x); else this.cihla(x, y);
            if (d <= 0) d += incE;
            else {
                d += incNE;
                y += slope;
            }
            if (this.ridkost) ted_jo = !ted_jo;
        }
    }

    cihla(x, y) {
        this.nastavBarvu(this.coords(x, y), 3);
    }

    zed_full(x1, y1, x2, y2) {
        if (y1 > y2) {
            var p = y1;
            y1 = y2;
            y2 = p;
        }

        var y;
        for (y = y1; y <= y2; y++) this.zed(x1, y, x2, y);
    }

    pocet_levelu() {
        return 24;
    }

    vygenerujLevel() {
        var results = [0, 0, 0];

        var mujlevel = this.level - 1;
        if (mujlevel > this.levels) {
            mujlevel = mujlevel % this.levels;
            if (mujlevel == 0) Math.floor(this.rychlost *= this.zrychleni);
            if (this.rychlost < 1) this.rychlost = 1;
        }

        results[1] = Math.floor(this.xsize / 2);
        results[2] = Math.floor(this.ysize / 2);

        this.zed_poly([0, 0, this.xsize - 1, 0, this.xsize - 1, this.ysize - 1, 0, this.ysize - 1, 0, 0]);

        if (mujlevel == 1) {
            this.zed(Math.floor(this.xsize / 4), Math.floor(this.ysize / 2), Math.floor(3 * this.xsize / 4), Math.floor(this.ysize / 2));
            results[2] += 3;
        } else if (mujlevel == 2) {
            this.zed(Math.floor(this.xsize / 4), 4, Math.floor(this.xsize / 4), this.ysize - 5);
            this.zed(Math.floor(3 * this.xsize / 4), 4, Math.floor(3 * this.xsize / 4), this.ysize - 5);
        } else if (mujlevel == 3) {
            this.zed(4, Math.floor(this.ysize / 2), this.xsize - 5, Math.floor(this.ysize / 2));
            this.zed(Math.floor(this.xsize / 2), 4, Math.floor(this.xsize / 2), this.ysize - 5);
            results[1] += 5;
            results[2] += 5;
        } else if (mujlevel == 4) {
            var x;
            for (x = 8; x < this.xsize; x += 8)
                this.zed(x, 0, x, this.ysize - 7);
            results[0] = 1;
        } else if (mujlevel == 5) {
            var suda = false;
            var x;
            for (x = 8; x < this.xsize; x += 8) {
                if (suda) this.zed(x, 6, x, this.ysize - 1); else this.zed(x, 0, x, this.ysize - 7);
                suda = !suda;
            }
            results[0] = 3;
        } else if (mujlevel == 6) {
            var x;
            for (x = 8; x < this.xsize; x += 8) {
                this.zed(x, 0, x, Math.floor(this.ysize / 2) - 3);
                this.zed(x, Math.floor(this.ysize / 2) + 3, x, this.ysize - 1);
            }
        } else if (mujlevel == 7) {
            var suda = false;
            var y;
            for (y = 6; y < this.ysize; y += 6) {
                if (suda) this.zed(6, y, this.xsize - 1, y); else this.zed(0, y, this.xsize - 7, y);
                suda = !suda;
            }
        } else if (mujlevel == 8) {
            var y;
            for (y = 6; y < this.ysize; y += 6) {
                this.zed(0, y, Math.floor(this.xsize / 2) - 4, y);
                this.zed(Math.floor(this.xsize / 2) + 4, y, this.xsize - 1, y);
            }
        } else if (mujlevel == 9) {
            this.zed(Math.floor(this.xsize / 4) + 1, 6, Math.floor(3 * this.xsize / 4) - 1, 6);
            this.zed(Math.floor(this.xsize / 4) + 1, this.ysize - 7, Math.floor(3 * this.xsize / 4) - 1, this.ysize - 7);
            this.zed(Math.floor(this.xsize / 4) - 1, 8, Math.floor(this.xsize / 4) - 1, this.ysize - 9);
            this.zed(Math.floor(3 * this.xsize / 4) + 1, 8, Math.floor(3 * this.xsize / 4) + 1, this.ysize - 9);
        } else if (mujlevel == 10) {
            var i;
            for (i = 0; i < 2; i++) {
                var n = 3 * i + 1;
                this.zed(Math.floor(n * this.xsize / 7) + 1, 6, Math.floor((n + 2) * this.xsize / 7) - 1, 6);
                this.zed(Math.floor(n * this.xsize / 7) + 1, this.ysize - 7, Math.floor((n + 2) * this.xsize / 7) - 1, this.ysize - 7);
                this.zed(Math.floor(n * this.xsize / 7) - 1, 8, Math.floor(n * this.xsize / 7) - 1, this.ysize - 9);
                this.zed(Math.floor((n + 2) * this.xsize / 7) + 1, 8, Math.floor((n + 2) * this.xsize / 7) + 1, this.ysize - 9);
            }
            results[0] = 1;
        } else if (mujlevel == 11) {
            var i;
            for (i = 0; i < 2; i++) {
                this.zed(Math.floor(this.xsize / 4) + 1 + 4 * i, 6 + 4 * i, Math.floor(3 * this.xsize / 4) - 1 - 4 * i, 6 + 4 * i);
                this.zed(Math.floor(this.xsize / 4) + 1 + 4 * i, this.ysize - 7 - 4 * i, Math.floor(3 * this.xsize / 4) - 1 - 4 * i, this.ysize - 7 - 4 * i);
                this.zed(Math.floor(this.xsize / 4) - 1 + 4 * i, 8 + 4 * i, Math.floor(this.xsize / 4) - 1 + 4 * i, this.ysize - 9 - 4 * i);
                this.zed(Math.floor(3 * this.xsize / 4) + 1 - 4 * i, 8 + 4 * i, Math.floor(3 * this.xsize / 4) + 1 - 4 * i, this.ysize - 9 - 4 * i);
            }
        } else if (mujlevel == 12) {
            this.zed(Math.floor(this.xsize / 6), Math.floor(this.ysize / 4), Math.floor(5 * this.xsize / 6), Math.floor(3 * this.ysize / 4));
            this.zed(Math.floor(this.xsize / 6), Math.floor(3 * this.ysize / 4), Math.floor(5 * this.xsize / 6), Math.floor(this.ysize / 4));
            this.zed_full(Math.floor(this.xsize / 2) - 2, Math.floor(this.ysize / 2) - 1, Math.floor(this.xsize / 2) + 2, Math.floor(this.ysize / 2) + 1);
            results[2] += 10;
        } else if (mujlevel == 13) {
            this.zed(Math.floor(this.xsize / 6), Math.floor(this.ysize / 4), Math.floor(5 * this.xsize / 6), Math.floor(3 * this.ysize / 4));
            this.zed(Math.floor(this.xsize / 6), Math.floor(3 * this.ysize / 4), Math.floor(5 * this.xsize / 6), Math.floor(this.ysize / 4));
            this.zed(Math.floor(this.xsize / 2), Math.floor(this.ysize / 6), Math.floor(this.xsize / 2), Math.floor(5 * this.ysize / 6));
            this.zed_full(Math.floor(this.xsize / 2) - 2, Math.floor(this.ysize / 2) - 1, Math.floor(this.xsize / 2) + 2, Math.floor(this.ysize / 2) + 1);
            results[1] += 5;
            results[2] += 10;
        } else if (mujlevel == 14) {
            this.zed(0, Math.floor(this.ysize / 4), Math.floor(this.xsize / 2), Math.floor(2 * this.ysize / 3));
            this.zed(this.xsize - 1, Math.floor(3 * this.ysize / 4), Math.floor(this.xsize / 2), Math.floor(this.ysize / 3));
        } else if (mujlevel == 15) {
            this.zed(0, Math.floor(this.ysize / 4), Math.floor(this.xsize / 3), Math.floor(2 * this.ysize / 3));
            this.zed(this.xsize - 1, Math.floor(3 * this.ysize / 4), Math.floor(2 * this.xsize / 3), Math.floor(this.ysize / 3));
            this.zed(Math.floor(3 * this.xsize / 4), 0, Math.floor(this.xsize / 3), Math.floor(this.ysize / 3) + 1);
            this.zed(Math.floor(this.xsize / 4), this.ysize - 1, Math.floor(2 * this.xsize / 3), Math.floor(2 * this.ysize / 3) - 1);
            this.cihla(Math.floor(this.xsize / 4) + 3, this.ysize - 2);
            this.cihla(Math.floor(3 * this.xsize / 4) - 3, 1);
            this.cihla(1, Math.floor(this.ysize / 4) + 2);
            this.cihla(this.xsize - 2, Math.floor(3 * this.ysize / 4) - 2);
        } else if (mujlevel == 16) {
            this.zed(Math.floor(this.xsize / 4) + 1, Math.floor(this.ysize / 2) - 1, Math.floor(this.xsize / 2) - 1, 6);
            this.zed(Math.floor(3 * this.xsize / 4) - 1, Math.floor(this.ysize / 2) - 1, Math.floor(this.xsize / 2) + 1, 6);
            this.zed(Math.floor(3 * this.xsize / 4) - 1, Math.floor(this.ysize / 2) + 1, Math.floor(this.xsize / 2) + 1, this.ysize - 7);
            this.zed(Math.floor(this.xsize / 4) + 1, Math.floor(this.ysize / 2) + 1, Math.floor(this.xsize / 2) - 1, this.ysize - 7);
        } else if (mujlevel == 17) {
            this.ridka_zed(Math.floor(this.xsize / 2), 0, Math.floor(this.xsize / 2), this.ysize - 1);
            results[1] += 3;
        } else if (mujlevel == 18) {
            var suda = false;
            var x;
            for (x = 8; x < this.xsize; x += 8) {
                if (suda) this.ridka_zed(x, 0, x, this.ysize - 1); else this.ridka_zed(x, 1, x, this.ysize - 1);
                suda = !suda;
            }
            results[0] = 3;
        } else if (mujlevel == 19) {
            this.zed(2, Math.floor(this.ysize / 2), this.xsize - 3, Math.floor(this.ysize / 2));
            results[2] += 3;
        } else if (mujlevel == 20) {
            this.zed(2, Math.floor(this.ysize / 2), this.xsize - 3, Math.floor(this.ysize / 2));
            this.zed(Math.floor(this.xsize / 2), 2, Math.floor(this.xsize / 2), this.ysize - 3);
            results[1] += 5;
            results[2] += 5;
        } else if (mujlevel == 21) {
            this.zed(2, Math.floor(this.ysize / 2), this.xsize - 3, Math.floor(this.ysize / 2));
            var x;
            for (x = 1; x <= 3; x++)
                this.zed(Math.floor(x * this.xsize / 4), 2, Math.floor(x * this.xsize / 4), this.ysize - 3);
            results[1] += 5;
            results[2] += 5;
            results[0] = 1;
        } else if (mujlevel == 22) {
            var suda = false;
            var x;
            for (x = 8; x < this.xsize; x += 8) {
                if (suda) this.zed(x, 2, x, this.ysize - 1); else this.zed(x, 0, x, this.ysize - 3);
                suda = !suda;
            }
            results[0] = 3;
        } else if (mujlevel == 23) {
            var i;
            for (i = 0; i < 2; i++) {
                var n = 3 * i + 1;
                this.zed(Math.floor(n * this.xsize / 7) + 1, 3 + i * Math.floor(this.ysize / 2), Math.floor((n + 2) * this.xsize / 7) - 1, 3 + i * Math.floor(this.ysize / 2));
                this.zed(Math.floor(n * this.xsize / 7) + 1, Math.floor(this.ysize / 2) - 3 + i * Math.floor(this.ysize / 2), Math.floor((n + 2) * this.xsize / 7) - 1, Math.floor(this.ysize / 2) - 3 + i * Math.floor(this.ysize / 2));
                this.zed(Math.floor(n * this.xsize / 7) - 1, 5 + i * Math.floor(this.ysize / 2), Math.floor(n * this.xsize / 7) - 1, Math.floor(this.ysize / 2) - 5 + i * Math.floor(this.ysize / 2));
                this.zed(Math.floor((n + 2) * this.xsize / 7) + 1, 5 + i * Math.floor(this.ysize / 2), Math.floor((n + 2) * this.xsize / 7) + 1, Math.floor(this.ysize / 2) - 5 + i * Math.floor(this.ysize / 2));

                n = 3 * ((i + 1) % 2) + 1;

                this.zed(Math.floor(n * this.xsize / 7) + 1, Math.floor(this.ysize / 2) - 3 + i * Math.floor(this.ysize / 2), Math.floor((n + 2) * this.xsize / 7) - 1, Math.floor(this.ysize / 2) - 3 + i * Math.floor(this.ysize / 2));
                this.zed(Math.floor((n + 1) * this.xsize / 7) - 1, 4 + i * Math.floor(this.ysize / 2), Math.floor(n * this.xsize / 7) - 1, Math.floor(this.ysize / 2) - 5 + i * Math.floor(this.ysize / 2));
                this.zed(Math.floor((n + 1) * this.xsize / 7) + 1, 4 + i * Math.floor(this.ysize / 2), Math.floor((n + 2) * this.xsize / 7) + 1, Math.floor(this.ysize / 2) - 5 + i * Math.floor(this.ysize / 2));
                this.cihla(Math.floor(n * this.xsize / 7) - 1, Math.floor(this.ysize / 2) - 4 + i * Math.floor(this.ysize / 2));
                this.cihla(Math.floor((n + 2) * this.xsize / 7) + 1, Math.floor(this.ysize / 2) - 4 + i * Math.floor(this.ysize / 2));
            }
        }

        return results;
    }
}

module.exports = Housenka;