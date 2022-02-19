/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

var socket
var players = []
var projectiles = []
var player
var powerups = []
var activeEffects = []
var powerupSound

function getPowerupIndex(id) {
    for (var i = 0; i < powerups.length; i++) {
        if (powerups[i].id === id) {
            return i;
        }
    }
}

function preload(){
	//soundFormats('mp3');
	//powerupSound = loadSound("library/powerup.mp3");
}


function playPowerupSound() {
	powerupSound.play();
	console.log("the sound has played");
}

/*
Player object:

pos: p5 vector  (x, y) position.  Only exists on client side
x: Number       x position.  Only exists on server side
y: Number       y position.  Only exists on server side
id: String      the socket id
num: int        the player number
size: int       the player size (basically a test value)
lastPing: Date  the last time the player has replied to the server
angle: Number   the angle of the player's sprite
*/

/*
XY object:

x: Number       the x position
y: Number       the y position
*/

//the players array consists of a list of Player objects, as above
//the players array has identical contents as the server-side players array

/*
Projectile object:
pos:    p5 vector on client side, XY object on server side
vel:    p5 vector on client side, XY object on server side.  measured in pixels per second
owner:  num of the player who fired the projectile
*/

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
data: empty object
effect: the server will create a new projectile at the player's position when it recieves this packet

changeHealth:
C -> S
data: the new health value
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
*/

//if you change these, also change them in server.js
const mapWidth = 3000;
const mapHeight = 2000;

/*let spritesheet;
let spritedata;
let animation = [];
let sprite;
function preload() {
    //spritedata = loadJSON('TestHorse/horse.json');
    //spritesheet = loadImage('TestHorse/spritesheet.png');
}*/

var cnv;
var camera;
let input, button;

function centerCanvas() {
	x = width / 2;
	y = height / 2;
	//(0);
}

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 20);
	centerCanvas();
}

function setup() {
	cnv = createCanvas(20, 20);
	cnv.parent("sketch-container");
	windowResized()
	centerCanvas();
	x = width / 2;
	y = height / 2;
	background(51);
	input = createInput();
	input.position(0, 0);

	button = createButton('Change Name');
	button.position(input.x + input.width, 0);
	button.mousePressed(changeName);

	textAlign(CENTER);
	textSize(50);
	socket = io.connect('http://localhost:3000');

	player = new HealthEntity(random(width), random(height),50,5,5, null);
	var data = {
		x: player.pos.x,
		y: player.pos.y,
		name: "SpaceShip"
	};
	camera = {
		x: 0,
		y: 0
	}

	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
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
			newProjectiles[i].size = 10;
			newProjectiles[i].teamColor = p.teamColor;
			newProjectiles[i].attack = p.attack;
		}

		//add all new projectiles to the projectiles array
		for (var i = 0; i < newProjectiles.length; i++) {
			projectiles.push(newProjectiles[i]);
		}

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
    /*let frames = spritedata.frames;
	for (let i = 0; i < frames.length; i++) {
	    let pos = frames[i].position;
	    let img = spritesheet.get(pos.x, pos.y, pos.w, pos.h);
	    animation.push(img);
	}
	sprite = new Sprite(animation, 50, 50, 1);
	*/
}

function changeName() {
	const name = input.value();
	input.value('');
	for (var i = 0; i < players.length; i++) {
		if (socket.id != undefined) {
			if (socket.id === players[i].id) {
				data = {
					newName: name,
					i: i
				}
				console.log(data)
				socket.emit('changeName', data);
			}
		}
	}

}

function draw() {

	if (player.teamColor === null) {
		for (var i = 0; i < players.length; i++) {
			if (socket.id === players[i].id) {
				player.teamColor = players[i].teamColor;
			}
		}
		console.log("Found me! " + player.teamColor);
	}

	background(51)
	//console.log("camera: " + camera.x + " " +  camera.y);

	
	//the closest distance a player can get to edge of the screen without the camera attempting to move
	var playerEdgeSoftLimitWidth = windowWidth / 10;
	var playerEdgeSoftLimitHeight = windowHeight / 10;
	var oldcamera = {
		x: camera.x,
		y: camera.y
	}

	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + windowWidth
	var edgeY = camera.y + windowHeight

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = mapWidth - windowWidth;
	var cameraLimitY = mapHeight - windowHeight;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX);
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY);

	camera.x = newCameraX;
	camera.y = newCameraY;
	/*if (camera.x != oldcamera.x || camera.y != oldcamera.y) {
		console.log("camera: " + camera.x + " " +  camera.y);
	}*/

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
	if (keyIsDown(code('q')) || keyIsDown(code('Q'))){
		player.MeleeAttack();
		console.log(sword.pos.x);
		//draw rectangle for 0.2 seconds, and fill with red
	}

	//const firerate for # shots per seconds
	//countdown
	//boolean shot that deteriorates timer

	for (var i = 0; i < projectiles.length; i++) {
		projectiles[i].smoothMove();
		
		if (projectiles[i].pos.x > mapWidth || projectiles[i].pos.x < 0 || projectiles[i].pos.y > mapHeight || projectiles[i].pos.y < 0) {
			projectiles.splice(i, 1);
			i--;
		}
    }

//

	var newAngle = Math.atan2(mouseY - (player.pos.y - camera.y), mouseX - (player.pos.x - camera.x));
	
	newAngle *= (180 / Math.PI);
	newAngle = -newAngle;
	if (newAngle < 0) {
		newAngle += 360;
	}
	if (!isNaN(newAngle)) {
		player.angle = newAngle;
	}
	//console.log("new angle: ",  newAngle)

	function colorsEqual(c1, c2) {
		return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
	}

	//collision for us
	for (var j = 0; j < projectiles.length; j++) {
		if(colorsEqual(projectiles[j].teamColor, player.teamColor)) {
			continue;
		}else if( player.isCollided(projectiles[j]) && player.health > 0) {
			console.log(player.teamColor);
			console.log(projectiles[j].teamColor);
			player.health -= projectiles[j].attack;

			var data = {
				newTeam: projectiles[j].teamColor,
				health: player.health
			}
			projectiles.splice(j, 1);
			j--;
			socket.emit('changeHealth', data);
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
			activeEffects.splice(i, 1);
			i--;
		}
	}
	
	//collision for powerups
	for (var i = 0; i < powerups.length; i++) {
		//console.log(powerups[i].pos.x, powerups[i].pos.y, player.pos.x, player.pos.y);
		if (player.isCollided(powerups[i])) {
			//console.log("collided with powerup");
			socket.emit('collectPowerup', powerups[i].id);
			powerups[i].apply(player);
			if (powerups[i].hasActiveEffect()) {
				var effect = powerups[i].getActiveEffect();
				activeEffects.push(effect);
			}
			powerups.splice(i, 1);
			i--;
			playPowerupSound()
		}
	}
    
	player.vel.x = player.vel.x * 0.8;
	player.vel.y = player.vel.y * 0.8;
	player.smoothMove();
	for (var i = players.length - 1; i >= 0; i--) {
		/*push()
		translate(players[i].x - camera.x, players[i].y - camera.y)
		rotate(players[i].angle);
		ellipse(0, 0, players[i].size * 1, players[i].size * 3);
		pop()*/

			push()
			fill(255, 255, 255)
			circle(players[i].x - camera.x, players[i].y - camera.y, players[i].size * 2);
			pop()
			push();
			fill(players[i].teamColor.r, players[i].teamColor.g, players[i].teamColor.b);
			angleMode(DEGREES)
			translate(players[i].x - camera.x, players[i].y - camera.y);
			rotate(-players[i].angle + 90);
			beginShape();
			vertex(0, -players[i].size * 2);
			vertex(-players[i].size, players[i].size * 2);
			vertex(0, -players[i].size + players[i].size * 2);
			vertex(players[i].size, players[i].size * 2);
			endShape(CLOSE);
			pop();
	

		//draw rectangle with players[i].x, and players[i].y + 3
		
		//max health bar (black)
		rect(players[i].x- camera.x -20, players[i].y  - camera.y + 25, player.maxHealth, 10);
		fill(players[i].teamColor.r, players[i].teamColor.g, players[i].teamColor.b);
		//current health bar (red)
		
		rect(players[i].x - camera.x -20, players[i].y - camera.y + 25, players[i].health, 10);
		
		fill(255);
		textAlign(CENTER);
		textSize((players[i].name.length + 15) / 3);
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
		fill(p.teamColor.r, p.teamColor.g, p.teamColor.b);
		ellipse(p.pos.x - camera.x, p.pos.y - camera.y, p.size, p.size);
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

/*
	if key is K or k
	draw rectangle(sword.x, sword.y, width, height);
	call MeleeAttack()
	call isCollision()

*/

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
		socket.emit('shoot', {})
	}
}

function mouseClicked(){
	socket.emit('shoot', {})
}