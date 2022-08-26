export class Particle {
  constructor(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.rad = 3;

    this.width = this.rad * 2;
    this.height = this.rad * 2;
  }

  update() {
    this.pos.add(this.vel);
    this.pos.x = (this.pos.x + width) % width;
    this.pos.y = (this.pos.y + height) % height;

    // Read-only
    this.x = this.pos.x - this.rad;
    this.y = this.pos.y - this.rad;
  }

  display() {
    let margin = 50;

    fill(128);
    noStroke();

    ellipse(this.pos.x, this.pos.y, this.rad, this.rad);

    let x = this.pos.x;
    let y = this.pos.y;

    if (this.pos.x < margin) {
      x += width;
      ellipse(x, y, this.rad, this.rad);
    } else if (this.pos.x > width - margin) {
      x -= width;
      ellipse(x, y, this.rad, this.rad);
    }

    if (this.pos.y < margin) {
      y += height;
      ellipse(x, y, this.rad, this.rad);
    } else if (this.pos.y > height - margin) {
      y -= height;
      ellipse(x, y, this.rad, this.rad);
    }
  }
}
