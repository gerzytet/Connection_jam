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

const enemyMaxSpeed = 0.30
const asteroidBaseSize = 25
const asteroidBaseVelocityMagnitude = 25
const asteroidChancePerTick = 0.01
const asteroidLimit = 20
const asteroidVariance = 50
const attackPowerMult = 2
const bulletSpeed = 10
const enemyAttack = 8
const enemyBaseHealth = 20
const enemyBulletSpeed = 2.5;
const enemyChancePerTick = 0.01
const enemyLimit = 5
const enemyShootChancePerTick = 0.005
const enemySize = 20
const mapHeight = 2000
const mapWidth = 3000
const playerAttack = 5
const playerMaxHealth = 50
const playerSize = 20
const powerupChancePerTick = 0.1
const powerupLimit = 25
const swordAttack = 10
const swordDuration = 1000
const swordSizeMultiplier = 4
const tickTime = 3
const timeoutMillis = 10000


//just to hold powerup types
class Powerup {
    static HEAL = 0;
    static SPEED = 1;
    static ATTACK = 2;
    static FUEL = 3;
}

//apply powerup effects to server-side players
function applyPowerup(player, type) {
    switch (type) {
        case Powerup.HEAL:
            player.health = playerMaxHealth;
            break;
        case Powerup.SPEED:
            //no server side changes necessary
            break;
        case Powerup.ATTACK:
            player.attack *= attackPowerMult;
            break;
        case Powerup.FUEL:
            //no server side changes necessary
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
        this.size = playerSize
        this.teamColor = new Color(c.r, c.g, c.b);
        this.name = name;
        this.health = playerMaxHealth;
        this.attack = playerAttack;
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
        this.size = asteroidBaseSize + Math.random() * asteroidVariance;
        this.health = this.size;
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
        this.size = enemySize;
        this.health = enemyBaseHealth;
        this.attack = enemyAttack;
        this.angle = 0
    };
}


var nextAsteroidId = 0;
//might spawn an asteroid, taking into account the chance of one per tick, and the limit
function doNewAsteroids() {
    if (Math.random() < asteroidChancePerTick && asteroids.length < asteroidLimit) {
        var x = Math.random() * mapWidth;
        var y = Math.random() * mapHeight;
        var vx = Math.random() * asteroidBaseVelocityMagnitude*2 - asteroidBaseVelocityMagnitude;
        var vy = Math.random() * asteroidBaseVelocityMagnitude*2 - asteroidBaseVelocityMagnitude;
        asteroids.push(
            new Asteroid(nextAsteroidId++, x, y, vx, vy)
        )
    }
}

//parameter is asteroid object
function spawnFuelFromAsteroidBreak(asteroid) {
    var numFuel = Math.floor((asteroid.size + 12) / 25);
    for (var i = 0; i < numFuel; i++) {
        var fuel = {
            pos: {
                x: asteroid.x + Math.random() * asteroid.size - asteroid.size / 2,
                y: asteroid.y + Math.random() * asteroid.size - asteroid.size / 2
            },
            type: Powerup.FUEL,
            id: nextPowerupId++
        }
        io.sockets.emit('newPowerup', fuel);
        powerups.push(fuel);
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


var nextEnemyId = 0;

//might spawn an enemy, taking into account the chance of one per tick, and the limit
function doNewEnemies() {
    if (Math.random() < enemyChancePerTick && enemies.length < enemyLimit) {
        var x = Math.random() * mapWidth;
        var y = Math.random() * mapHeight;
        var vx = 0;
        var vy = 0;
        enemies.push(
            new Enemy(nextEnemyId++, x, y, vx, vy)
        )
    }
}

//milliseconds between each heartbeat() call
setInterval(heartbeat, tickTime);


var powerups = []
var nextPowerupId = 0;


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

function getNearestPlayer(x, y) {
    var nearestPlayer = null;
    var nearestDistance = Number.MAX_VALUE;
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        var distance = Math.sqrt(Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2));
        if (distance < nearestDistance) {
            nearestPlayer = player;
            nearestDistance = distance;
        }
    }
    return nearestPlayer;
}

function tickEnemies() {
    if (players.length === 0) {
        return
    }
    for (var i = 0; i < enemies.length; i++) {
        var nearestPlayer = getNearestPlayer(enemies[i].x, enemies[i].y);
        var dx = nearestPlayer.x - enemies[i].x;
        var dy = nearestPlayer.y - enemies[i].y;
        var angle = Math.atan2(-dy, dx);
        var degrees = angle * 180 / Math.PI;
        enemies[i].angle = degrees;

        
        enemies[i].x += Math.cos(angle) * enemyMaxSpeed;
        enemies[i].y += -Math.sin(angle) * enemyMaxSpeed;

        if (Math.random() < enemyShootChancePerTick) {
            var enemy = enemies[i];
            var shot = {
                pos: {
                    x: enemy.x,
                    y: enemy.y
                },
                vel: {
                    x: enemyBulletSpeed * Math.cos(angle),
                    y: -enemyBulletSpeed * Math.sin(angle)
                },
                size: 10,
                teamColor: new Color(255, 255, 255),
                attack: enemy.attack,
                owner: null,
                timeout: 10000
            }

            io.sockets.emit('enemyShoot', shot);
        }
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
    doNewEnemies();
    for (var i = 0; i < asteroids.length; i++) {
        //remove asteroid
        if (asteroids[i].health <= 0) {
            toRemove.push(asteroids[i]);
        }
    }
    moveAsteroids();
    tickEnemies()
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
        enemies: enemies
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
    socket.on('damageEnemy', damageEnemy)

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
        var xvel = Math.cos(toRadians(angle)) * bulletSpeed;
        var yvel = -Math.sin(toRadians(angle)) * bulletSpeed;

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
        player.health=playerMaxHealth;
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
        var swordWidth = p.size * swordSizeMultiplier;
        var swordHeight = p.size * swordSizeMultiplier;
	    var x = p.x + Math.cos(p.angle * Math.PI / 180) * (swordWidth / 2 + p.size * 2);
	    var y = p.y - Math.sin(p.angle * Math.PI / 180) * (swordWidth / 2 + p.size * 2);
	    //swordEntity = new Sword(x, y, player.angle, swordWidth, swordHeight, 1000);
        var swordEntity = {
            x: x,
            y: y,
            angle: p.angle,
            attack: swordAttack,
            size: p.size * swordSizeMultiplier,
            duration: swordDuration,
            teamColor: p.teamColor,
            id: socket.id
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
        asteroids[d].vx = asteroids[d].vx + (data.bvelx * (1 / asteroids[d].size) * 50);
        asteroids[d].vy = asteroids[d].vy + (data.bvely * (1 / asteroids[d].size) * 50);
        if (asteroids[d].health <= 0) {
            spawnFuelFromAsteroidBreak(asteroids[d]);
            asteroids.splice(d, 1);
        }
    }

    function damageEnemy(data) {
        var d = getEnemyIndex(data.id);
        if (d === undefined) {
            console.log("Warning: enemy not found in damage enemy function");
            return;
        }

        enemies[d].health -= data.attack;
        if (enemies[d].health <= 0) {
            enemies.splice(d, 1);
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

//get enemy index given enemy id
function getEnemyIndex(id) {
    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].id === id) {
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
            io.sockets.emit('gameWon', gameWon);
        }
    } else {
        gameWon = false;
    }
    
    //console.log("Game Won: " + gameWon);
}