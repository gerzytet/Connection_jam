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
*/

var mapWidth = 3000;
var mapHeight = 2000;

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
	socket = io.connect('http://localhost:3000');

	player = new HealthEntity(random(width), random(height),50,5,5, null);
	var data = {
		x: player.pos.x,
		y: player.pos.y
	};
	camera = {
		x: 0,
		y: 0
	}

	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
		players = data['players'];
		newProjectiles = data['newProjectiles'];
		
		//convert XY objects into p5 vectors
		for (var i = 0; i < newProjectiles.length; i++) {
			var p = newProjectiles[i];
			var pos = p.pos;
			pos = createVector(pos.x, pos.y);
			var vel = p.vel;
			vel = createVector(vel.x, vel.y);
			newProjectiles[i] = new Entity(pos.x, pos.y, 1);
			newProjectiles[i].vel = vel;
			newProjectiles[i].size = 10;
			newProjectiles[i].owner = p.owner;
		}

		//add all new projectiles to the projectiles array
		for (var i = 0; i < newProjectiles.length; i++) {
			projectiles.push(newProjectiles[i]);
		}

		socket.emit('heartbeatReply', {});
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

function draw() {
	if (player.num === null) {
		for (var i = 0; i < players.length; i++) {
			if (socket.id === players[i].id) {
				player.num = players[i].num;
			}
		}
		console.log("Found me! " + player.num);
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
	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		player.vel.y = -1;
		//player.pos.y -= 10;
		//console.log("UP_ARROW PRESSED");
	}
	if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		player.vel.y = 1;
		//player.pos.y += 10;
		//console.log("DOWN_ARROW PRESSED");
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		player.vel.x = -1;
		//player.pos.x -= 10;
		//console.log("LEFT_ARROW PRESSED");
	}
	if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		player.vel.x = 1;
		//player.pos.x += 10;
		//console.log("RIGHT_ARROW PRESSED");
	}

	for (var i = 0; i < projectiles.length; i++) {
		projectiles[i].smoothMove();
		
		if (projectiles[i].pos.x > mapWidth || projectiles[i].pos.x < 0 || projectiles[i].pos.y > mapHeight || projectiles[i].pos.y < 0) {
			projectiles.splice(i, 1);
			i--;
		}
    }

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

	if (players.num !== null) {
		//do collision
		for (var i = 0; i < players.length; i++) {
			for (var j = 0; j < projectiles.length; j++) {
				var player = players[i];
				var projectile = projectiles[j];
				if (projectile.owner === player.num) {
					continue;
				}
				//get our position and projectile position
				var playerPos = player.pos;
				var projectilePos = projectile.pos;
				var dist = Math.sqrt(Math.pow(playerPos.x - projectilePos.x, 2) + Math.pow(playerPos.y - projectilePos.y, 2));
				var collisionDist = player.size + projectile.size;
				if (dist < collisionDist) {
					projectiles.splice(j, 1);
					player.health /= 2;
					j--;
				}
		    }
		}
	}


	player.smoothMove();
	for (var i = players.length - 1; i >= 0; i--) {
		if (players[i].num === 0) { fill(255, 0, 0) }
		else if (players[i].num === 1) { fill(0, 0, 255) }
		else if (players[i].num === 2) { fill(0, 255, 0) }
		else if (players[i].num === 3) { fill(255, 255, 0) }
		else { fill(255, 102, 25) }
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
		fill('red');
		//current health bar (red)
		rect(players[i].x - camera.x -20, players[i].y - camera.y + 25, player.health, 10);
		
		fill(255);
		textAlign(CENTER);
		textSize(15);
		text(players[i].num + 1, players[i].x - camera.x, players[i].y - camera.y + (players[i].size / 3));
	}
	//render projectiles
	for (var i = projectiles.length - 1; i >= 0; i--) {
		var p = projectiles[i];
		fill(255, 102, 25);
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

function keyReleased() {
	if (keyCode === UP_ARROW || key === 'w' || key === 'W') {
		player.vel.y = 0;
		//player.pos.y -= 10;
		//console.log("UP_ARROW PRESSED");
	} else if (keyCode === DOWN_ARROW || key === 's' || key === 'S') {
		player.vel.y = 0;
		//player.pos.y += 10;
		//console.log("DOWN_ARROW PRESSED");
	} else if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
		player.vel.x = 0;
		//player.pos.x -= 10;
		//console.log("LEFT_ARROW PRESSED");
	} else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
		player.vel.x = 0;
		//player.pos.x += 10;
		//console.log("RIGHT_ARROW PRESSED");
	}
}

function keyTyped() {
	if (keyCode === 32) {
		socket.emit('shoot', {})
	}
	if (key === 'q') {
		player.angle += 5;
		console.log(angle)
	}
}
