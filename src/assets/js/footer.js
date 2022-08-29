const webmaster = document.querySelector('#webmaster');
const canvas = document.querySelector('#webmaster + canvas');
canvas.confetti = canvas.confetti || confetti.create(canvas, { resize: true });

webmaster.addEventListener('mouseover', () => {
  canvas.confetti({
    particleCount: 20,
    startVelocity: 20,
    decay: 0.8,
    spread: 40,
    origin: { y: 1 },
    scalar: 1,
  });
});
