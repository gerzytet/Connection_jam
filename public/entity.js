/*
@file entity.js (player.js)
@author entire team
@date 2/18/2022
@brief File that controls basic player functions
*/

class Entity {

	constructor(x, y, speed){
		this.pos = createVector(x, y)
		this.size = 20
		this.vel = createVector(0, 0)
		this.speed = speed
	}

	show() {

	}

	smoothMove() {
		this.pos.x += this.vel.x * this.speed;
		this.pos.y += this.vel.y * this.speed;
		this.pos.x = max(this.pos.x, 0)
		this.pos.y = max(this.pos.y, 0)
	}

}

class HealthEntity extends Entity {

	constructor(x, y, health, attack, speed){
		super(x,y);
		this.maxHealth = health;
		this.health = health;
		this.attack = 1;
		this.speed = speed;
		this.angle = 0;
	}

	
}
