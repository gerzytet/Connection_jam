/*
@file entity.js (player.js)
@author entire team
@date 2/18/2022
@brief File that controls basic player functions
*/

class Color {
	constructor(r, g, b) {
		this.r = r;
		this.g = g;
		this.b = b;
	}

}


class Entity {

	constructor(x, y, speed, attack, size = 3, teamColor = new Color(255, 255, 255), image = null) {
		this.pos = createVector(x, y);
		this.vel = createVector(0, 0);
		this.acc = createVector(0, 0);
		this.maxSpeed = speed;
		this.size = size;
		this.angle = 0;
		this.attack = attack;
		this.teamColor = teamColor;
		//this.image = image;
	}

	show() {
		ellipse(this.pos.x, this.pos.y, this.size, this.size);
		//image(this.image, this.position.x, this.position.y, this.size, this.size);
	}

	smoothMove() {
		this.vel.x += this.acc.x;
		this.vel.y += this.acc.y;
		this.vel.limit(this.maxSpeed);
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;
		this.pos.x = max(this.pos.x, 0)
		this.pos.y = max(this.pos.y, 0)
	}

	isCollided(other) {
		let distance = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
		//console.log("distance : " + distance + "from " + other);
		return distance < this.size + other.size;
	}

	startTime(time) {
		// remove item after a time period

	}

}

class Sword extends Entity {
	constructor(x, y, angle, size, attack, duration, teamColor) {
		super(x, y, 0, attack, size, teamColor)
		this.angle = angle
		this.duration = duration
		this.startTime = millis()
		this.used = false;
	}

	isExpired() {
		return millis() - this.startTime > this.duration;
	}
}

class HealthEntity extends Entity {

	constructor(x, y, health, attack, speed, teamColor = new Color(255,0,0)) {
		super(x, y, speed, attack, 10, 0);
		this.maxHealth = health;
		this.health = health;
		this.speed = speed;
		this.attackSpeed = speed + 4;
		this.teamColor = teamColor;
		this.boost = 0.0;
	}

	isAlive() {
		return this.health > 0;
	}

	shootE() {
		let bullet = new Entity(this.pos.x, this.pos.y, this.attackSpeed, this.attack, 5, this.teamColor);
		bullet.vel.x = this.attackSpeed * cos(this.angle);
		bullet.vel.y = this.attackSpeed * sin(this.angle);
		return bullet;
	}
}

class Powerup extends Entity {
	//x and y are the same as parent
	//Number type is the type of powerup
	//Number id is a unique id for each powerup object
	static HEAL = 0;
	static SPEED = 1;

	static colorFromType(type) {
		switch (type) {
			case Powerup.HEAL:
				return new Color(212, 68, 235);
			case Powerup.SPEED:
				return new Color(118, 200, 214);
			default:
				return new Color(255, 255, 255);
		}
	}

	constructor(x, y, type, id) {
		super(x, y, 0, 0, 5, Powerup.colorFromType(type));
		this.type = type;
		this.id = id;
	}

	//show is the same as parent

	apply(player) {
		switch (this.type) {
			case Powerup.HEAL:
				player.health = player.maxHealth;
				break;
			case Powerup.SPEED:
				player.maxSpeed *= 2;
				break;
		}
	}

	hasActiveEffect() {
		return this.type == Powerup.SPEED;
	}

	getActiveEffect() {
		if (!this.hasActiveEffect()) {
			return;
		}
		if (this.type == Powerup.SPEED) {
			return new ActiveEffect(Powerup.SPEED, 10000);
		}
	}
}

//an active powerup effect
class ActiveEffect {
	//started and duration are in milliseconds
	//type is the type of effect
	constructor(type, duration) {
		this.type = type
		this.duration = duration
		this.started = millis()
	}

	isExpired() {
		return this.started + this.duration < millis();
	}

	unApply(player) {
		switch (this.type) {
			case Powerup.SPEED:
				player.maxSpeed /= 2;
				break;
		}
	}
}
