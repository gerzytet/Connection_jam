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
    static ATTACK = 2;
}

//apply powerup effects to server-side players
function applyPowerup(player, type) {
    switch (type) {
        case Powerup.HEAL:
            player.health = 50;
            break;
        case Powerup.SPEED:
            //no server side changes necessary
            break;
        case Powerup.ATTACK:
            player.attack *= 2;
            break;
    }
}
function randomPowerupType() {
    return Math.floor(Math.random() * 3);
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

var asteroids = [];
var enemies = [];

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
    };
}

class Asteroid {
    constructor(id, x, y, vx, vy) {
        this.id = id;
        this.x = x;
        this.y = y;
        //pixels per second
        this.vx = vx;
        this.vy = vy;
        this.size = 20;
        this.health = 10;
    };
}

class Enemy {
    constructor(id, x, y, vx, vy) {
        this.id = id;
        this.x = x;
        this.y = y;
        //pixels per second
        this.vx = vx;
        this.vy = vy;
        this.size = 20;
        this.health = 20;
        this.attack = 2.5;
    };
}

const asteroidChancePerTick = 0.01;
const asteroidLimit = 20;
var nextAsteroidId = 0;
//might spawn an asteroid, taking into account the chance of one per tick, and the limit
function doNewAsteroids() {
    if (Math.random() < asteroidChancePerTick && asteroids.length < asteroidLimit) {
        var x = Math.random() * mapWidth;
        var y = Math.random() * mapHeight;
        var vx = Math.random() * 50 - 25;
        var vy = Math.random() * 50 - 25;
        asteroids.push(
            new Asteroid(nextAsteroidId++, x, y, vx, vy)
        )
    }
}

//moves all asteroids
//asteroids that hit the wall will reflect
function moveAsteroids() {
    for (var i = 0; i < asteroids.length; i++) {
        var asteroid = asteroids[i];
        asteroid.x += asteroid.vx * tickTime / 1000;
        asteroid.y += asteroid.vy * tickTime / 1000;
        if (asteroid.x < 0) {
            asteroid.x = 0;
            asteroid.vx = -asteroid.vx;
        }
        if (asteroid.x > mapWidth) {
            asteroid.x = mapWidth;
            asteroid.vx = -asteroid.vx;
        }
        if (asteroid.y < 0) {
            asteroid.y = 0;
            asteroid.vy = -asteroid.vy;
        }
        if (asteroid.y > mapHeight) {
            asteroid.y = mapHeight;
            asteroid.vy = -asteroid.vy;
        }
    }
}

const enemyChancePerTick = 0.01;
const enemyLimit = 20;
var nextEnemyId = 0;

//might spawn an enemy, taking into account the chance of one per tick, and the limit
function doNewEnemies() {
    if (Math.random() < enemyChancePerTick && enemies.length < enemyLimit) {
        var x = Math.random() * mapWidth;
        var y = Math.random() * mapHeight;
        var vx = Math.random() * 50 - 25;
        var vy = Math.random() * 50 - 25;
        enemies.push(
            new Enemy(nextEnemyId++, x, y, vx, vy)
        )
    }
}

//milliseconds between each heartbeat() call
var tickTime = 33
setInterval(heartbeat, tickTime);
const timeoutMillis = 10000;

var powerups = []
var nextPowerupId = 0;
const powerupChancePerTick = 0.1;
const powerupLimit = 25;

//might spawn a powerup, taking into account the chance of one per tick, and the limit
function doNewPowerups() {
    if (Math.random() < powerupChancePerTick && powerups.length < powerupLimit) {
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

//things to run every tick
function heartbeat() {
    GameWon(players);
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
    doNewPowerups();
    doNewAsteroids();
    for (var i = 0; i < asteroids.length; i++) {
        //remove asteroid
        if (asteroids[i].health <= 0) {
            toRemove.push(asteroids[i]);
        }
    }
    moveAsteroids();
    //doNewEnemies();
    /*for (var i = 0; i < enemies.length; i++) {
        //remove enemy
        if (enemies[i].health <= 0) {
            toRemove.push(enemies[i]);
        }
    }*/
    io.sockets.emit('heartbeat', {
        players: players,
        newProjectiles: newProjectiles,
        asteroids : asteroids,
    });
    newProjectiles = [];
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
    socket.on('meeleAttack', meeleAttack)
    socket.on('expirePowerup', expirePowerup)
    socket.on('damageAsteroid', damageAsteroid)

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
            //console.log("Warning: player not found in heartbeat function");
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
            attack: players[d].attack,
            owner: players[d].id,
            size: data
        };
        newProjectiles.push(projectile);
    }

    //player and enemy are player objects
    function switchTeam(player,enemy){
        console.log(enemy, players)
        if (colorsEqual(enemy, {
            r: 255,
            g: 255,
            b: 255
        })) {
            enemy = getRandomTeam(player)
        }
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
        console.log(newTeam, players[d].health);

        if(players[d].health <= 0){
            console.log("dead " + d);
            switchTeam(players[d], data['newTeam']);
        }
    }

    function changeName(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in change name function");
            return;
        }
        players[d].name = data;
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

    function hitPlayers(data) {
        var ids = data['ids'];
        var attackerD = getIndex(socket.id);

        for (var i = 0; i < ids.length; i++) {
            var d = getIndex(ids[i]);
            if (d === undefined) {
                console.log("Warning: player not found in hit players function");
                return;
            }
            players[d].health -= data['damage'];
            if (players[d].health <= 0) {
                switchTeam(players[d], players[attackerD].teamColor);
            }
        }
    }

    function meeleAttack(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in meele attack function");
            return;
        }
        var p = players[d]
        var swordWidth = p.size * 4;
        var swordHeight = p.size * 4;
	    var x = p.x + Math.cos(p.angle * Math.PI / 180) * (swordWidth / 2 + p.size * 2);
	    var y = p.y - Math.sin(p.angle * Math.PI / 180) * (swordWidth / 2 + p.size * 2);
	    //swordEntity = new Sword(x, y, player.angle, swordWidth, swordHeight, 1000);
        var swordEntity = {
            x: x,
            y: y,
            angle: p.angle,
            attack: 10,
            size: p.size * 4,
            duration: 1000,
            teamColor: p.teamColor
        }
        io.sockets.emit('meeleAttack', swordEntity);
    }

    function expirePowerup(data) {
        var type = data;
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in expire powerup function");
            return;
        }

        switch (type) {
            case Powerup.ATTACK:
                players[d].attack /= 2;
                break;
            default:
                //no changes necessary
        }
    }

    function damageAsteroid(data) {
        var id = data.id
        var damage = data.damage
        var d = getAsteroidIndex(id);
        if (d === undefined) {
            console.log("Warning: asteroid not found in damage asteroid function");
            return;
        }
        console.log(d, damage)
        asteroids[d].health -= damage;
        if (asteroids[d].health <= 0) {
            asteroids.splice(d, 1);
        }
    }
}

function getAsteroidIndex(id) {
    for (var i = 0; i < asteroids.length; i++) {
        if (asteroids[i].id === id) {
            return i;
        }
    }
    return undefined;
}

function colorsEqual(c1, c2) {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

function getRandomTeam(player) {
    var allTeams = []
    for (var i = 0; i < players.length; i++) {
        //check if players[i].teamColor is already in allTeams
        var found = false;
        for (var j = 0; j < allTeams.length; j++) {
            if (colorsEqual(players[i].teamColor, allTeams[j])) {
                found = true;
                break;
            }
        }
        if (!found) {
            allTeams.push(players[i].teamColor);
        }
    }

    var index = Math.floor(Math.random() * allTeams.length);

	return allTeams[index];
}

//get powerup index given powerup id
function getPowerupIndex(id) {
    for (var i = 0; i < powerups.length; i++) {
        if (powerups[i].id === id) {
            return i;
        }
    }
}

//get player index given player id
function getIndex(id) {
    for (var i = 0; i < players.length; i++) {
        //console.log(i + ' ' + (id === players[i].id))
        if (id === players[i].id) {
            return i;
        }
    }
}

//true if the game is over/won
function GameWon(players) {
    if (players.length !== 0) {
        color1 = players[0].teamColor;
        gameWon = false;
        samecolor = false;
        for (var i = 0; i < players.length; i++) {
            if (color1.r === players[i].teamColor.r && color1.g === players[i].teamColor.g && color1.b === players[i].teamColor.b) {
                samecolor = true;
            } else {
                samecolor = false;
                break;
            }
        }
        if (samecolor === false) {
            gameWon = false;
        } else if (samecolor === true && (players.length > 1)) {
            gameWon = true;
            //socket.emit('gameWon', gameWon);
        }
    } else {
        gameWon = false;
    }
    
    //console.log("Game Won: " + gameWon);
}