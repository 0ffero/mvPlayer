"use strict"
String.prototype.capitalise = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function arraySortByKey(array, key) {
    if (!Array.isArray(array)) return false;
    return array.sort(function(a, b) {
        return ((a[key] < b[key]) ? -1 : ((a[key] > b[key]) ? 1 : 0));
    });
};

var checkType = (_variable, _type)=> {
    let valid = false; // the default response is "false"

    switch (_type) {
        case 'array': valid = Array.isArray(_variable) ? true: false; break;
        case 'boolean': case 'bool': valid = typeof _variable === 'boolean' ? true : false; break;
        case 'float': valid = !Number.isInteger(_variable) && typeof _variable==='number' ? true : false; break;
        case 'integer': case 'int': valid = Number.isInteger(_variable) ? true : false; break;
        case 'number': valid = typeof _variable === 'number' ? true : false; break;
        case 'object': valid = typeof _variable === 'object' ? true : false; break;
        case 'string': case 'str': valid = typeof _variable === 'string' ? true : false; break;
        default:
            console.error(`This type (${_type}) has no check!\nUnable to test variables validity.`);
            valid = false;
        break;
    };

    return valid;
};

function framesToMs(_frames) {
    if (Number.isInteger(_frames)) {
        return 1000/60*_frames;
    } else {
        return false;
    }
};

function generateRandomID(_g=false) {
    let generatedID = '';
    let maxC = 8;
    if (_g!==false) { maxC = 16; }
    for (let i=0; i<maxC; i++) {
        generatedID +=~~((Math.random()*9)+1).toString();
    }
    return generatedID;
};

function isVar(searchFor='Phaser') {
    let message = '';
    if (searchFor==='Phaser') { message = 'No variable passed... Searching for Phaser variable\n'; }
    for(var q in window) { 
        if(window.hasOwnProperty(q) && q===searchFor) {
            message += `Found the variable '${searchFor}'`;
            vars.DEBUG ? console.log(message) : null;
            return true;
        }
    }
    return false;
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    };
    return array;
};

function getRandom(_min,_max=null) { // this function can deal with a min/max, array or a string
    if (!Phaser) { console.error(`This function needs Phaser to be initialised before use!`); return false; }

    if (Array.isArray(_min)) {
        return Phaser.Math.RND.pick(_min);
    } else {
        if (typeof _min==='number' && typeof _max==='number') {
            return Phaser.Math.RND.between(_min,_max);
        } else if (typeof _min==='string' && _max===null) { // string has been passed 
            return Phaser.Math.RND.pick(_min.split(''));
        } else {
            console.error('The first passed var must either be an array, integer or string. If a 2nd value is passed it must be an integer');
        };
    };
};