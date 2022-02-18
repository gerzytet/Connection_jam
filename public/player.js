function Player(x, y) {
	this.pos = createVector(x, y)
	this.size = 20
	this.vel = createVector(0, 0)


	this.show = function () {
		fill(255);
		ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
	}

	this.smoothMove = function () {
		console.log(this.pos)
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;
		console.log(this.pos)
    }
}