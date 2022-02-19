class Sprite {
    constructor(animation, x, y, speed) {
        this.x = x;
        this.y = y;
        this.animation = animation;
        this.len = this.animation.length;
        this.speed = speed;
        this.index = 0;
    }

    shox() {
        image(animation[frameCount % animation.length], 0, 0);
    }

    animate() {
        this.index += this.speed;
    }
}