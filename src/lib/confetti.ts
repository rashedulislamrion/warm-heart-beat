import confetti from "canvas-confetti";

export function fireConfetti() {
  const colors = ["#ff6b35", "#f7c948", "#ff8f6b", "#ffb347", "#22c55e"];
  const defaults = { origin: { y: 0.7 }, colors, disableForReducedMotion: true };
  confetti({ ...defaults, particleCount: 80, spread: 70, startVelocity: 45 });
  setTimeout(() => confetti({ ...defaults, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.75 } }), 150);
  setTimeout(() => confetti({ ...defaults, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } }), 300);
}
