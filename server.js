/*
@file server.js
@author Entire team
@date 2/18/2022
@brief File that sets up server
*/

var express = require('express')

var app = express()
var server = app.listen(3000)
var newProjectiles = [];

const mapWidth = 3000;
const mapHeight = 2000;

//just to hold powerup types
class Powerup {
    static HEAL = 0;
    static SPEED = 1;
}
function applyPowerup(player, type) {
    switch (type) {
        case Powerup.HEAL:
            player.health = 50;
            break;
        case Powerup.SPEED:
            //no server side changes necessary
            break;
    }
}
function randomPowerupType() {
    return Math.floor(Math.random() * 2);
}

app.use(express.static('public'))

console.log('My server is running')

class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

}

var socket = require('socket.io')
var io = socket(server)
var players = []
var colors = [(255)];
io.sockets.on('connection', newConnection)



class Player {
    constructor(id,name, x, y, c) {
        this.id = id
        this.x = x
        this.y = y
        this.size = 20
        this.teamColor = new Color(c.r, c.g, c.b);
        this.name = name;
        this.health = 50;
        this.attack = 5;
    }
}

var tickTime = 33
setInterval(heartbeat, tickTime);
const timeoutMillis = 10000;

var powerups = []
var nextPowerupId = 0;
const powerupChancePerSecond = 0.1;
const powerupLimit = 25;

function doNewPowerups() {
    if (Math.random() < powerupChancePerSecond && powerups.length < powerupLimit) {
        var powerup = {
            pos: {
                //random between 0 and mapWidth
                x: Math.random() * mapWidth,
                y: Math.random() * mapHeight
            },
            type: randomPowerupType(),
            id: nextPowerupId++
        }
        io.sockets.emit('newPowerup', powerup);
        powerups.push(powerup);
    }
}

function heartbeat() {
    var toRemove = [];
    for (var i = 0; i < players.length; i++) {
        //if now - players.lastPing > timeoutMillis
        //remove player
        if (Date.now() - players[i].lastPing > timeoutMillis) {
            toRemove.push(players[i]);
        }
    }
    if (toRemove.length > 0) {
        console.log("removing " + toRemove.length);
    }
    var newPlayers = [];
    for (var i = 0; i < players.length; i++) {
        if (!toRemove.includes(players[i])) {
            newPlayers.push(players[i]);
        }
    }
    players = newPlayers;
    io.sockets.emit('heartbeat', {
        players: players,
        newProjectiles: newProjectiles
    });
    newProjectiles = [];
    doNewPowerups();
}
teams = [];
openspace = false;
function newConnection(socket) {
    console.log('New connection: ' + socket.id)
    socket.on('start', Start)
    socket.on('move', Move)
    socket.on('heartbeatReply', heartbeatReply)
    socket.on('shoot', shoot)
    socket.on('changeHealth', changeHealth)
    socket.on('changeName', changeName)
    socket.on('collectPowerup', collectPowerup)
    function Start(data) {
        //console.log(socket.id + ' ' + data.x + ' ' + data.y);
        var c = (255)
        while (colors.includes(c)) {
            c = new Color(Math.floor(Math.random() * 255) + 1, Math.floor(Math.random() * 255) + 1, Math.floor(Math.random() * 255) + 1)
        }
        var player = new Player(socket.id,data.name, data.x, data.y, c);
        players.push(player);
        colors.push(c);
    }

    function Move(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in Move function");
            return;
        }
        //console.log(players)
        //console.log(d + ' ' + data.x + ' ' + data.y);
        players[d].x = data.x;
        players[d].y = data.y;
        players[d].angle = data.angle;
    }

    function heartbeatReply(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in heartbeat function");
            return;
        }

        if (d === undefined) {
            console.log("error " + socket.id + ' ' + players);
        }
        players[d].lastPing = Date.now();
    }

    function shoot(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in shoot function");
            return;
        }
        var angle = players[d].angle;
        function toRadians(deg) {
            return deg * (Math.PI / 180);
        }
        var xvel = Math.cos(toRadians(angle)) * 10;
        var yvel = -Math.sin(toRadians(angle)) * 10;

        var projectile = {
            pos: {
                x: players[d].x,
                y: players[d].y
            },
            vel: {
                x: xvel,
                y: yvel
            },
            teamColor: players[d].teamColor,
            attack: players[d].attack
        };
        newProjectiles.push(projectile);
    }

    //player and enemy are player objects
    function switchTeam(player,enemy){
        console.log(enemy, players)
        player.teamColor = enemy;
        player.health=50;
        //randomize x and y
        player.x = Math.floor(Math.random() * 20) + 1;
        player.y = Math.floor(Math.random() * 20) + 1;
        console.log(players);
    }

    function changeHealth(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in change health function");
            return;
        }
        players[d].health = data['health'];
        var newTeam = data['newTeam'];
        if (newTeam === undefined) {
            console.log("Warning: new team not found in change health function");
            return;
        }

        if(players[d].health <= 0){
            console.log("dead " + d);
            switchTeam(players[d], data['newTeam']);

        }
    }

    function changeName(data) {
        console.log(data.newName)
        players[data.i].name = data.newName;
        console.log(players[data.i].name)
    }

    function collectPowerup(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in collect powerup function");
            return;
        }
        var p = getPowerupIndex(data);
        if (p === undefined) {
            console.log("Warning: powerup not found in collect powerup function");
            return;
        }
        applyPowerup(players[d], powerups[p].type);

        powerups.splice(p, 1);

        io.sockets.emit('collectPowerup', data);
    }

    socket.emit('allPowerups', powerups);
}

function getPowerupIndex(id) {
    for (var i = 0; i < powerups.length; i++) {
        if (powerups[i].id === id) {
            return i;
        }
    }
}

function getIndex(id) {
    for (var i = 0; i < players.length; i++) {
        //console.log(i + ' ' + (id === players[i].id))
        if (id === players[i].id) {
            return i;
        }
    }
}