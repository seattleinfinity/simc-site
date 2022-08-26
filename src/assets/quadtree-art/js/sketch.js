import { draw } from './draw.js';
import { particles } from './vars.js';
import { Particle } from './Particle.js';

// Globals
window.Vector = p5.Vector;
let sketchContainer = document.querySelector('#sketch-container');
let quadtreeContent = document.querySelector('#quadtree-content');

window.setup = () => {
  const canvas = createCanvas(windowWidth, 600);
  canvas.parent(sketchContainer);
  pixelDensity(3);
  ellipseMode('center');
  ellipseMode('radius');

  let n = (width * height) / 10000;
  for (let i = 0; i < n; i++) {
    let pos = new Vector(random(0, width), random(0, height));
    let vel = Vector.random2D().mult(random(0.1, 0.5));
    particles.push(new Particle(pos, vel));
  }

  // Create a fade-in animation
  let opacity = 0;
  let handle = window.setInterval(() => {
    quadtreeContent.style.opacity = opacity;
    opacity += 0.01;

    if (opacity >= 1.0) {
      window.clearInterval(handle);
    }
  }, 10);
};

window.windowResized = () => {
  resizeCanvas(windowWidth, height);
};

window.draw = draw;
