/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

var sounds = ['library/blaster.mp3', 'library/boost.mp3', 'library/laser_sword.mp3', 'library/powerup.mp3'];

var blasterSound = new Howl({
	src:[sounds[0]],
	loop: false,
	volume: 0.25
});
var boostSound = new Howl({
	src:[sounds[1]],
	loop: false
});
var laserSwordSound = new Howl({
	src:[sounds[2]],
	loop: false
});
var powerupSound = new Howl({
	src:[sounds[3]],
	loop: false
});

//howler crap
//const {Howl, Howler} = require('howler');

var socket
var players = []

const projectileTimeout = 5000;
var projectiles = []
var player
var powerups = []
var activeEffects = []
var asteroids = []
var enemies = []

//returns index of powerups array corresponding to the powerup id
function getPowerupIndex(id) {
    for (var i = 0; i < powerups.length; i++) {
        if (powerups[i].id === id) {
            return i;
        }
    }
}

//return index of asteroids array corresponding to the asteroid id
function getAsteroidIndex(id) {
    for (var i = 0; i < asteroids.length; i++) {
        if (asteroids[i].id === id) {
            return i;
        }
    }
    return undefined;
}

/*
types of packets:

S: server
C: client
S -> C: a packet that gets sent from the server to client size
C -> S: a packet that gets sent from the client to server size

heartbeat:
S -> C
data: {
	player: player array from server
	newProjectiles: projectiles array from server
}
effect: The client sets its player array to the recieved player array when it recieves
this packet is sent by the server every 33 milliseconds.

start:
C -> S
data: an XY object
effect: the server creates a new player at this position associated with the socket id when it recieves

move:
C -> S
data: an XY object
effect: the server moves the player to the specified position when it recieves

heartbeatReply:
C -> S
data: empty object
effect: the server will know that the client is still connected when it recieves this packet

shoot:
C -> S
data: bullet size
effect: the server will create a new projectile at the player's position when it recieves this packet

changeHealth:
C -> S
data: {
	Number health: the new health value
	Color newTeam: the team color of the attacker
}
effect: the server will change the player's health when it recieves this packet

newPowerup:
S -> C
data: a powerup object, containing: {
	int type: the type of powerup
	XY pos: the position of the powerup
	int id: the id of the powerup
}
effect: the client will add this powerup to its list

allPowerups:
S -> C
data: an array of powerup objects
effect: the client will add all powerups to its list

collectPowerup:
C -> S
S -> C
data: the id of the powerup (unique id)
effect (server): the server will remove this powerup, update the server-size player value, then relay this packet to all clients
effect (client): the client will remove this powerup from its list

meeleAttack:
C -> S
S -> C
data: empty object from client to server, then sword object from server to client
effect (server): the server will create a new meele attack at the player's position when it recieves this packet
effect (client): the client will add this meele attack to its list

expirePowerup:
C -> S
data: powerup type
effect: the server will remove this powerup effect

damageAsteroid:
C -> S
S -> C
data: {
	Number id: the id of the asteroid
	Number damage: the damage to be done to the asteroid
}
effect (server): the server will damage the asteroid when it recieves this packet
effect (client): the client will damage the asteroid when it recieves this packet

changeName:
C -> S
data: new name
effect: the server will change the player's name when it recieves this packet
*/

//if you change these, also change them in server.js
const mapWidth = 3000;
const mapHeight = 2000;

var cnv;
var camera;
var input, button;
var img;
var bg;
var pship;
//var PlayerShipImage = new Image();

var isGameOver

function centerCanvas() {
	x = width / 2;
	y = height / 2;
	//(0);
}

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 20);
	centerCanvas();
}

function preload() {
	bg = loadImage('Sprites/Sprite_Background.png', () => {}, () => {
		console.log("failed to load background");
	});
	pship = loadImage('Sprites/Player_Ship_2.png', () => {}, () => {
		console.log("failed to load player ship");
	});
}

function setup() {
	//20, 20 is initial canvas size, gets replaced by window resized function
	cnv = createCanvas(20, 20);
	cnv.parent("sketch-container");
	windowResized()
	centerCanvas();
	isGameOver = false
	
	//name entry:
	background(255);
	input = createInput();
	input.position(0, 0);

	button = createButton('Change Name');
	button.position(input.x + input.width, 0);
	button.mousePressed(changeName);

	textAlign(CENTER);
	textSize(50);
	
	socket = io.connect('http://localhost:3000');
	
	//TODO
	//mapWidth/5 is just a testing artefact, so players spawn close together. replace with undivided values in final
	player = new HealthEntity(random(mapWidth / 5), random(mapHeight / 5),50,5,5, null);
	var data = {
		x: player.pos.x,
		y: player.pos.y,
		name: "SpaceShip " + floor(random(122))
	};
	camera = {
		x: 0,
		y: 0
	}

	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
		//replace player array with data from server
		//as well as projectile array
		players = data['players'];
		newProjectiles = data['newProjectiles'];
		
		//convert list of projectiles into entities
		for (var i = 0; i < newProjectiles.length; i++) {
			var p = newProjectiles[i];
			var pos = p.pos;
			pos = createVector(pos.x, pos.y);
			var vel = p.vel;
			vel = createVector(vel.x, vel.y);
			newProjectiles[i] = new Entity(pos.x, pos.y, vel.mag());
			newProjectiles[i].vel = vel;
			newProjectiles[i].size = p.size;
			newProjectiles[i].teamColor = p.teamColor;
			newProjectiles[i].attack = p.attack;
			newProjectiles[i].setTimeout(projectileTimeout);
			newProjectiles[i].owner = p.owner;
		}

		//add all new projectiles to the projectiles array
		for (var i = 0; i < newProjectiles.length; i++) {
			projectiles.push(newProjectiles[i]);
		}

		//convert list of asteroids into entities
		asteroids = []
		var newAsteroids = data['asteroids'];
		for (var i = 0; i < newAsteroids.length; i++) {
			asteroid = new HealthEntity(
				newAsteroids[i].x,
				newAsteroids[i].y,
				newAsteroids[i].health,
				1,
				0,
				new Color(255, 255, 255)
			)
			asteroid.id = newAsteroids[i].id;
			asteroid.size = 50
			asteroid.maxHealth = 10
		    asteroids.push(asteroid)
		}
		
		//convert list of enemies into entities
		/*var enemies = data['enemies'];
		for (var i = 0; i < enemies.length; i++) {
			enemies.push(
				new HealthEntity(
					enemies[i].x,
					enemies[i].y,
					enemies[i].health,
					0,
					0,
					new Color(255, 255, 255)
				)
			)
		}*/
		socket.emit('heartbeatReply', {});
	})

	function addPowerupFromData(data) {
		console.log("adding powerup!")
		powerups.push(new Powerup(data.pos.x, data.pos.y, data.type, data.id))
	}

	socket.on('newPowerup', function (data) {
		addPowerupFromData(data)
	})

	socket.on('allPowerups', function (data) {
		for (var i = 0; i < data.length; i++) {
			addPowerupFromData(data[i])
		}
	})

	socket.on('collectPowerup', function (data) {
		var p_i = getPowerupIndex(data)
		if (p_i === undefined) {
			return;
		}
		powerups.splice(p_i, 1)
	})

	socket.on('meeleAttack', function (data) {
		swords.push(new Sword(
			data.x,
			data.y,
			data.angle,
			data.size,
			data.attack,
			data.duration,
			data.teamColor
		))
	})
}

//change name to input value
function changeName() {
	const name = input.value();
	input.value('');
	data = name
	player.name = name;
	socket.emit('changeName', data);
}

function colorsEqual(c1, c2) {
	return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

function takeDamage(amount, attackingTeam) {
	player.health -= amount;
	var data = {
		newTeam: attackingTeam,
		health: player.health
	}
	if (player.health <= 0) {
		//if attacking team is all white
		if (colorsEqual(attackingTeam, {
				r: 255,
				g: 255,
				b: 255
			})) {
			player.teamColor = null
		} else {
			player.teamColor = attackingTeam;
			console.log(player)
		}
		player.health = player.maxHealth
	}
	socket.emit('changeHealth', data);
}

function gameOver() {

}

function draw() {
	if (isGameOver) {
		gameOver()
		return;
	}

	//initially, we don't know our own team color.  Wait for the server to tell us
	if (player.teamColor === null) {
		for (var i = 0; i < players.length; i++) {
			if (socket.id === players[i].id) {
				player.teamColor = players[i].teamColor;
				camera.x = max(width / 2 - players[i].x, 0);
				camera.y = max(height / 2 - players[i].y, 0);
			}
		}
		console.log("Found me! " + player.teamColor);
	}
	
	//the closest distance a player can get to edge of the screen without the camera attempting to move
	var playerEdgeSoftLimitWidth = width / 10;
	var playerEdgeSoftLimitHeight = height / 10;
	var oldcamera = {
		x: camera.x,
		y: camera.y
	}

	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + width
	var edgeY = camera.y + height

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = mapWidth - width;
	var cameraLimitY = mapHeight - height;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX);
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY);

	camera.x = newCameraX;
	camera.y = newCameraY;

	//case when player is at the top or left of the screen
	var edgeX = camera.x
	var edgeY = camera.y

	var distFromEdgeX = player.pos.x - edgeX
	var distFromEdgeY = player.pos.y - edgeY

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = 0;
	var cameraLimitY = 0;

	var newCameraX = max(camera.x - cameraMoveX, cameraLimitX);
	var newCameraY = max(camera.y - cameraMoveY, cameraLimitY);
	
	camera.x = newCameraX;
	camera.y = newCameraY;

	function code(c) {
		return c.charCodeAt()
	}

	//background image
	background(51);
	image(bg,-camera.x,-camera.y,3000,2000);


	//controls basic player movement
	var accMagnitude = player.maxSpeed / 5;

	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		player.acc.y = -accMagnitude;
		//player.pos.y -= 10;
		//console.log("UP_ARROW PRESSED");
	}
	if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		player.acc.y = accMagnitude;
		//player.pos.y += 10;
		//console.log("DOWN_ARROW PRESSED");
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		player.acc.x = -accMagnitude;
		//player.pos.x -= 10;
		//console.log("LEFT_ARROW PRESSED");
	}
	if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		player.acc.x = accMagnitude;
		//player.pos.x += 10;
		//console.log("RIGHT_ARROW PRESSED");
	}

	//delete projectiles that are too close to the edge of the screen
	for (var i = 0; i < projectiles.length; i++) {
		projectiles[i].smoothMove();

		if (Math.abs(projectiles[i].pos.x) < 0.01 || Math.abs(projectiles[i].pos.y) < 0.01 || Math.abs(projectiles[i].pos.x - mapWidth) < 0.01 || Math.abs(projectiles[i].pos.y - mapHeight) < 0.01) {
			projectiles.splice(i, 1);
			i--;
		}
    }

	//the angle determined by mouse position
	var newAngle = Math.atan2(mouseY - (player.pos.y - camera.y), mouseX - (player.pos.x - camera.x));
	
	//value needs to be wrangled because of differing coordinate systems
	newAngle *= (180 / Math.PI);
	newAngle = -newAngle;
	if (newAngle < 0) {
		newAngle += 360;
	}
	if (!isNaN(newAngle)) {
		player.angle = newAngle;
	}

	//collision for us
	for (var j = 0; j < projectiles.length; j++) {
		if (projectiles[j].isExpired()) {
			projectiles.splice(j, 1);
			j--;
			continue;
		}
		if(colorsEqual(projectiles[j].teamColor, player.teamColor)) {
			continue;
		}else if( player.isCollided(projectiles[j]) && player.health > 0) {
			takeDamage(projectiles[j].attack, projectiles[j].teamColor)
			projectiles.splice(j, 1);
			j--;
		}
	}

	//collision for asteroids against us
	for (var i = 0; i < asteroids.length; i++)
	{
		if(player.isCollided(asteroids[i]) && player.health > 0) {
			takeDamage(asteroids[i].attack, new Color(255, 255, 255))
		}
	}

	//collision for asteroids against projectiles
	for (var i = 0; i < asteroids.length; i++) {
		for (var j = 0; j < projectiles.length; j++) {
			if(asteroids[i].isCollided(projectiles[j])) {
				if (projectiles[j].id === player.id) {
					//this is our projectile
					console.log(asteroids)
					socket.emit('damageAsteroid', {
						id: asteroids[i].id,
						damage: projectiles[j].attack
					})
				}
			
				projectiles.splice(j, 1);
				j--;
			}
		}
	}

	//collision for others
	for (var i = 0; i < players.length; i++) {
		//if players[i] is us, skip
		if (players[i].id === socket.id || players[i].health <= 0) {
			continue;
		}
		//we just delete balls when we detect collision
		for (var j = 0; j < projectiles.length; j++) {
			if(colorsEqual(projectiles[j].teamColor, players[i].teamColor)) {
				continue;
			}
			//log size and pos of both
			var collisionDist = projectiles[j].size + players[i].size;
			var distance = Math.sqrt(Math.pow(projectiles[j].pos.x - players[i].x, 2) + Math.pow(projectiles[j].pos.y - players[i].y, 2));
			var isCollided = distance < collisionDist;
			if(isCollided) {
				projectiles.splice(j, 1);
				j--;
			}
		}
	}
	
	//check for active effect expiration
	for (var i = 0; i < activeEffects.length; i++) {
		var effect = activeEffects[i];
		if (effect.isExpired()) {
			effect.unApply(player)
			socket.emit('expirePowerup', effect.type)
			activeEffects.splice(i, 1);
			i--;
		}
	}
	
	//collision for powerups
	for (var i = 0; i < powerups.length; i++) {
		//console.log(powerups[i].pos.x, powerups[i].pos.y, player.pos.x, player.pos.y);
		if (player.isCollided(powerups[i])) {
			//console.log("collided with powerup");
			powerupSound.play();
			socket.emit('collectPowerup', powerups[i].id);
			powerups[i].apply(player);
			if (powerups[i].hasActiveEffect()) {
				var effect = powerups[i].getActiveEffect();
				activeEffects.push(effect);
			}
			powerups.splice(i, 1);
			i--;
			//POWERUP_SOUND.play();
			//POWERUP_SOUND.loop = false;
		}
	}

	//collision for swords
	for (var i = 0; i < swords.length; i++) {
		if (swords[i].isExpired()) {
			swords.splice(i, 1);
			i--;
			continue;
		}
		if (colorsEqual(player.teamColor, swords[i].teamColor) || swords[i].used) {
			continue;
		}
		var collisionDist = swords[i].size + players[i].size;
		var distance = Math.sqrt(Math.pow(swords[i].pos.x - player.pos.x, 2) + Math.pow(swords[i].pos.y - player.pos.y, 2));
		var isCollided = distance < collisionDist;
		if(isCollided) {
			takeDamage(swords[i].attack, swords[i].teamColor);
			swords[i].used = true;
		}
	}

	const linkDistance = 200
	player.attackSize = 10
	var links = 0;
	//draw player connections
	for (var i = 0; i < players.length; i++) {
		for (var j = i; j < players.length; j++) {
			if (i == j) {
				continue;
			}
			if (!colorsEqual(players[i].teamColor, players[j].teamColor)) {
				continue;
			}

			var distance = Math.sqrt(Math.pow(players[i].x - players[j].x, 2) + Math.pow(players[i].y - players[j].y, 2));
			console.log(distance);
			if (distance < linkDistance) {
				if (players[i].id === socket.id || players[j].id === socket.id) {
					links++
				}
				push()
				stroke(players[i].teamColor.r, players[i].teamColor.g, players[i].teamColor.b);
				strokeWeight(4);
				line(players[i].x - camera.x, players[i].y - camera.y, players[j].x - camera.x, players[j].y - camera.y);
				pop()
			}
		}
	}
	player.attackSize *= (links * 1.6 + 1);
    
	player.vel.x = player.vel.x * 0.99;
	player.vel.y = player.vel.y * 0.99;
	player.smoothMove();
	//render players
	for (var i = players.length - 1; i >= 0; i--) {
		push();
		angleMode(DEGREES)
		translate(players[i].x - camera.x, players[i].y - camera.y);
		rotate(-players[i].angle + 90);
		tint(players[i].teamColor.r, players[i].teamColor.g, players[i].teamColor.b);
		imageMode(CENTER);
		image(pship, 0, 0, players[i].size * 3.5, players[i].size * 3.5);
		pop();
		
		//max health bar (black)
		fill(0, 0, 0);
		rect(players[i].x- camera.x -20, players[i].y  - camera.y + 25, player.maxHealth, 10);
		
		//current health bar (same as player color)
		fill(players[i].teamColor.r, players[i].teamColor.g, players[i].teamColor.b);
		rect(players[i].x - camera.x -20, players[i].y - camera.y + 25, players[i].health, 10);
		
		//display player name
		fill(255);
		textAlign(CENTER);
		textSize(200 / (players[i].name.length + 15));
		text(players[i].name, players[i].x - camera.x, players[i].y - camera.y + (players[i].size + 20));
	}
	//render projectiles
	for (var i = projectiles.length - 1; i >= 0; i--) {
		var p = projectiles[i];
		fill(p.teamColor.r, p.teamColor.g, p.teamColor.b);
		ellipse(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);
	}

	//render powerups
	for (var i = powerups.length - 1; i >= 0; i--) {
		var p = powerups[i];

		//red triangle for health
		if(powerups[i].type === Powerup.HEALTH){
			fill(255, 0, 0);
			triangle(p.pos.x - camera.x, p.pos.y - camera.y, p.pos.x - camera.x + p.size, p.pos.y - camera.y, p.pos.x - camera.x + p.size/2, p.pos.y - camera.y + p.size);
		} else if(powerups[i].id === Powerup.SPEED){
			fill(255, 255, 255);
			rect(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);
			fill(0, 255, 0);
			rect(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);
			rect(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);

		}else if(powerups[i].id === Powerup.ATTACK){
			fill(0,20,200);
			ellipse(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);

			//text on triangle to say "Zoom"
			fill(0,0,0);
			textAlign(CENTER);
			text("Zoom", p.pos.x - camera.x, p.pos.y - camera.y + (p.size + 20));
		}
	}

	//render asteroids
	for (var i = asteroids.length - 1; i >= 0; i--) {
		var p = asteroids[i];
		fill(107, 88, 83);
		ellipse(p.pos.x - camera.x, p.pos.y - camera.y, p.size * 2, p.size * 2);
	}	

	//render enemies
	/*for (var i = enemies.length - 1; i >=0; i --) {
		var p = enemies[i];
		fill(107, 88, 83);
		ellipse(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);

	}*/

	//render swords
	//currently in a broken state
	for (var i = 0; i < swords.length; i++) {
		var sword = swords[i];
		if (sword.isExpired()) {
			sword = undefined;
		} else {
			push()
			rectMode(CENTER)
			fill(sword.teamColor.r, sword.teamColor.g, sword.teamColor.b);
			translate(sword.pos.x - camera.x, sword.pos.y - camera.y)
			rotate(-sword.angle);
			arc(0, 0, 280, 280, 0, PI + QUARTER_PI, PIE);
			pop()
		}
	}

	var data = {
		x: player.pos.x,
		y: player.pos.y,
		angle: player.angle
	};

	socket.emit('move', data)
    /*sprite.show();
	sprite.animate();*/
}

var swords = []
//in milliseconds:
const swordCooldown = 1000;
var lastSwordTime = -10000;

//true if the sword cooldown is over
function isSwordReady() {
	console.log(millis() - lastSwordTime, swordCooldown)
	return (millis() - lastSwordTime) > swordCooldown;
}

//do meele atttack, checks cooldown
function meeleAttack() {
	if (!isSwordReady()) {
		return;
	}
	laserSwordSound.play();
	lastSwordTime = millis();
	socket.emit('meeleAttack', {})
}

function keyReleased() {
	if (keyCode === UP_ARROW || key === 'w' || key === 'W') {
		player.acc.y = 0;
		player.vel.y = player.vel.y / 2;
	} else if (keyCode === DOWN_ARROW || key === 's' || key === 'S') {
		player.acc.y = 0;
		player.vel.y = player.vel.y / 2;
	} else if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
		player.acc.x = 0;
		player.vel.x = player.vel.x / 2;
	} else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
		player.acc.x = 0;
		player.vel.x = player.vel.x / 2;
	}
}

function keyTyped(){
	if (keyCode === 32) {
		socket.emit('shoot', player.attackSize)
		blasterSound.play();
	}
	if (keyCode === 107 || keyCode === 75) {
		meeleAttack()
	}
}

function mouseClicked(){
	socket.emit('shoot', player.attackSize)
	blasterSound.play();
}