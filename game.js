"use strict";

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 600;

const GRAVITY      = 0.45;   // px / frame²
const FLAP_FORCE   = -9.5;   // upward velocity on tap
const PIPE_SPEED   = 2.8;    // px / frame
const PIPE_WIDTH   = 64;
const GAP_HEIGHT   = 160;    // vertical gap between top/bottom wall
const PIPE_INTERVAL = 90;    // frames between pipe spawns
const GHOST_X      = 80;     // fixed horizontal position
const GHOST_R      = 20;     // collision-circle radius (visual sprite ~40×40)

// Sky gradient stops
const SKY_TOP    = "#0d0728";
const SKY_BOTTOM = "#1e1060";

// Pipe colours
const PIPE_FILL   = "#4c1d95";
const PIPE_STROKE = "#7c3aed";
const PIPE_CAP    = "#6d28d9";
const CAP_H       = 18;
const CAP_OVER    = 6;   // how many px the cap extends past the pipe body

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {"idle"|"playing"|"dead"} */
let state = "idle";

let ghostY      = CANVAS_H / 2;
let ghostVY     = 0;
let score       = 0;
let bestScore   = parseInt(localStorage.getItem("flappyKiro_best") || "0", 10);
let frameCount  = 0;
let animId      = null;

/** @type {{x:number, gapTop:number, scored:boolean}[]} */
let pipes = [];

// ─── Assets ───────────────────────────────────────────────────────────────────
const ghostImg    = new Image();
ghostImg.src      = "assets/ghosty.png";

const jumpAudio    = new Audio("assets/jump.wav");
const gameOverAudio = new Audio("assets/game_over.wav");

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const canvas     = document.getElementById("gameCanvas");
const ctx        = canvas.getContext("2d");
const startScreen  = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const hud        = document.getElementById("hud");
const liveScore  = document.getElementById("live-score");
const finalScore = document.getElementById("final-score");
const bestScoreEl = document.getElementById("best-score");

// ─── Input ────────────────────────────────────────────────────────────────────
function onFlap() {
  if (state === "idle")   { startGame(); return; }
  if (state === "dead")   return;
  ghostVY = FLAP_FORCE;
  jumpAudio.currentTime = 0;
  jumpAudio.play().catch(() => {});
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); onFlap(); }
});
canvas.addEventListener("click", onFlap);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); onFlap(); }, { passive: false });

document.getElementById("start-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  startGame();
});
document.getElementById("restart-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  startGame();
});

// ─── Game lifecycle ───────────────────────────────────────────────────────────
function startGame() {
  ghostY     = CANVAS_H / 2;
  ghostVY    = 0;
  score      = 0;
  frameCount = 0;
  pipes      = [];
  state      = "playing";

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  liveScore.textContent = "0";

  if (animId) cancelAnimationFrame(animId);
  loop();
}

function endGame() {
  state = "dead";
  gameOverAudio.currentTime = 0;
  gameOverAudio.play().catch(() => {});

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("flappyKiro_best", bestScore);
  }

  finalScore.textContent = score;
  bestScoreEl.textContent = bestScore;
  hud.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
}

// ─── Pipe helpers ─────────────────────────────────────────────────────────────
function spawnPipe() {
  const minGapTop = 60;
  const maxGapTop = CANVAS_H - GAP_HEIGHT - 60;
  const gapTop = Math.floor(Math.random() * (maxGapTop - minGapTop + 1)) + minGapTop;
  pipes.push({ x: CANVAS_W, gapTop, scored: false });
}

// ─── Collision ────────────────────────────────────────────────────────────────
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

function checkCollision() {
  // Ground / ceiling
  if (ghostY + GHOST_R >= CANVAS_H || ghostY - GHOST_R <= 0) return true;

  for (const p of pipes) {
    const px = p.x;
    // Top pipe rect
    if (circleRect(GHOST_X, ghostY, GHOST_R - 4, px, 0, PIPE_WIDTH, p.gapTop)) return true;
    // Bottom pipe rect
    const bottomY = p.gapTop + GAP_HEIGHT;
    if (circleRect(GHOST_X, ghostY, GHOST_R - 4, px, bottomY, PIPE_WIDTH, CANVAS_H - bottomY)) return true;
  }
  return false;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // subtle star dots
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 40; i++) {
    // deterministic pseudo-random from index so stars don't flicker
    const sx = ((i * 173 + 37) % CANVAS_W);
    const sy = ((i * 211 + 53) % (CANVAS_H * 0.75));
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
}

function drawPipe(x, gapTop) {
  const gapBottom = gapTop + GAP_HEIGHT;

  // Top pipe body
  ctx.fillStyle = PIPE_FILL;
  ctx.fillRect(x, 0, PIPE_WIDTH, gapTop);
  // Top pipe side border
  ctx.strokeStyle = PIPE_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, 0, PIPE_WIDTH - 2, gapTop);
  // Top cap
  ctx.fillStyle = PIPE_CAP;
  ctx.fillRect(x - CAP_OVER, gapTop - CAP_H, PIPE_WIDTH + CAP_OVER * 2, CAP_H);
  ctx.strokeRect(x - CAP_OVER + 1, gapTop - CAP_H + 1, PIPE_WIDTH + CAP_OVER * 2 - 2, CAP_H - 2);

  // Bottom pipe body
  ctx.fillStyle = PIPE_FILL;
  ctx.fillRect(x, gapBottom, PIPE_WIDTH, CANVAS_H - gapBottom);
  ctx.strokeStyle = PIPE_STROKE;
  ctx.strokeRect(x + 1, gapBottom, PIPE_WIDTH - 2, CANVAS_H - gapBottom - 1);
  // Bottom cap
  ctx.fillStyle = PIPE_CAP;
  ctx.fillRect(x - CAP_OVER, gapBottom, PIPE_WIDTH + CAP_OVER * 2, CAP_H);
  ctx.strokeRect(x - CAP_OVER + 1, gapBottom + 1, PIPE_WIDTH + CAP_OVER * 2 - 2, CAP_H - 2);
}

function drawGhost(y) {
  const size = GHOST_R * 2;
  const gx = GHOST_X - GHOST_R;
  const gy = y - GHOST_R;

  if (ghostImg.complete && ghostImg.naturalWidth > 0) {
    ctx.drawImage(ghostImg, gx, gy, size, size);
  } else {
    // Fallback: draw a simple ghost shape with canvas API
    ctx.save();
    ctx.translate(GHOST_X, y);

    // Body glow
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, GHOST_R);
    glow.addColorStop(0, "rgba(167,139,250,0.95)");
    glow.addColorStop(1, "rgba(109,40,217,0.1)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, GHOST_R + 4, 0, Math.PI * 2);
    ctx.fill();

    // Ghost body
    ctx.fillStyle = "#ddd6fe";
    ctx.beginPath();
    ctx.arc(0, -2, GHOST_R * 0.85, Math.PI, 0, false);
    ctx.lineTo(GHOST_R * 0.85, GHOST_R * 0.6);
    // wavy bottom
    const w = GHOST_R * 0.85;
    ctx.quadraticCurveTo( w * 0.67, GHOST_R * 0.9,  w * 0.33, GHOST_R * 0.6);
    ctx.quadraticCurveTo( w * 0,    GHOST_R * 0.9, -w * 0.33, GHOST_R * 0.6);
    ctx.quadraticCurveTo(-w * 0.67, GHOST_R * 0.9, -w,        GHOST_R * 0.6);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath(); ctx.ellipse(-7, -4, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 7, -4, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-6, -5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 8, -5, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}

function drawGround() {
  ctx.fillStyle = "#2d1b69";
  ctx.fillRect(0, CANVAS_H - 4, CANVAS_W, 4);
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function loop() {
  if (state !== "playing") return;

  // Physics
  ghostVY += GRAVITY;
  ghostY  += ghostVY;
  frameCount++;

  // Spawn pipes
  if (frameCount % PIPE_INTERVAL === 0) spawnPipe();

  // Move & score pipes
  for (const p of pipes) {
    p.x -= PIPE_SPEED;
    if (!p.scored && p.x + PIPE_WIDTH < GHOST_X) {
      p.scored = true;
      score++;
      liveScore.textContent = score;
    }
  }
  // Remove off-screen pipes
  pipes = pipes.filter((p) => p.x + PIPE_WIDTH + CAP_OVER > -20);

  // Collision check
  if (checkCollision()) {
    endGame();
    // Final frame render before stopping
    draw();
    return;
  }

  draw();
  animId = requestAnimationFrame(loop);
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();
  for (const p of pipes) drawPipe(p.x, p.gapTop);
  drawGhost(ghostY);
  drawGround();
}

// ─── Initial render (idle state) ─────────────────────────────────────────────
draw();
