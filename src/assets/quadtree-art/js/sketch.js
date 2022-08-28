import { draw } from './draw.js';
import { particles } from './vars.js';
import { Particle } from './Particle.js';

// Globals
window.Vector = p5.Vector;
let sketchContainer = document.querySelector('#sketch-container');
let quadtreeContent = document.querySelector('#quadtree-content');

window.setup = () => {
  const canvas = createCanvas(document.body.clientWidth, 945);
  canvas.parent(sketchContainer);
  pixelDensity(1);
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
      console.log('yay');
    }
  }, 10);
};

window.windowResized = () => {
  resizeCanvas(document.body.clientWidth, height);
};

window.draw = draw;
