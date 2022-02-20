/*
@file color_gen.js
@author Christian R
@date 2/18/2022
@brief File that generates specific colors for users when they enter the game.
*/

const cyrb53 = function(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
 function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

//TODO:
//find a smarter way to do this that ensures colors are spaced properly
//returns an array of length 3 with R, G, B values
function colorFromId(id) {
    if (id <= 0) {
        console.log("id must be greater than 0")
        return undefined;
    }

    var offset, increment, num;
    offset = increment = num = 0;
    if (id <= 4) {
        offset = 0;
        increment = 0.25;
        num = id - 1;
    }
    else if (id <= 8) {
        offset = 0.125;
        increment = 0.25;
        num = id - 5;
    }
    else if (id <= 16) {
        offset = 0.0625;
        increment = 0.125;
        num = id - 9;
    } else if (id <= 32) {
        offset = 0.03125;
        increment = 0.0625;
        num = id - 17;
    }
    return hslToRgb(offset + increment * num, 0.5, 0.5);
}

function test() {
    console.log(colorFromId(1))
    console.log(colorFromId(2))
    console.log(colorFromId(3))
}

//test()