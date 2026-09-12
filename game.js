"use strict";
// =============================================================================
// Flappy Kiro — Premium Game Engine
// Zero external dependencies: all visuals & audio are procedurally generated.
// Architecture: input() -> update(dt) -> render() strict separation.
// =============================================================================

// ── Canvas setup (HiDPI) ─────────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

const LOGICAL_W = 400;
const LOGICAL_H = 600;
let   DPR       = Math.min(window.devicePixelRatio || 1, 3);

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = rect.width  * DPR;
  canvas.height = rect.height * DPR;
  canvas.style.width  = rect.width  + "px";
  canvas.style.height = rect.height + "px";
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(DPR * rect.width / LOGICAL_W, DPR * rect.height / LOGICAL_H);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ── Audio (Web Audio API — procedural) ───────────────────────────────────────
const AC = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, dur, vol = 0.3, startFreq = null) {
  if (AC.state === "suspended") AC.resume();
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = type;
  const now = AC.currentTime;
  o.frequency.setValueAtTime(startFreq || freq, now);
  if (startFreq) o.frequency.exponentialRampToValueAtTime(freq, now + dur * 0.5);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.start(now); o.stop(now + dur);
}

function sfxFlap()     { playTone(520, "sine",     0.08, 0.18, 800); }
function sfxScore()    { playTone(880, "triangle", 0.12, 0.22); setTimeout(() => playTone(1100,"triangle",0.1,0.18), 80); }
function sfxCombo()    { playTone(1320,"triangle", 0.18, 0.28); }
function sfxHit()      { playTone(120, "sawtooth", 0.35, 0.4,  200); }
function sfxPowerup()  { [600,750,900,1100].forEach((f,i) => setTimeout(() => playTone(f,"sine",0.15,0.22), i*60)); }
function sfxShield()   { playTone(400, "sine",     0.2,  0.25, 300); }

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY       = 0.42;
const FLAP_FORCE    = -9.2;
const PIPE_W        = 60;
const GAP_H         = 155;
const GHOST_R       = 18;
const GHOST_X       = 90;
const BASE_SPEED    = 2.6;

// Power-up durations (ms)
const PU_DURATION = { shield:5000, rocket:4000, mini:7000, flip:6000 };
const PU_ICONS    = { shield:"◈", rocket:"▲", mini:"●", flip:"⇅" };
const PU_COLORS   = { shield:"#60a5fa", rocket:"#f59e0b", mini:"#34d399", flip:"#f472b6" };

// ── State ─────────────────────────────────────────────────────────────────────
let STATE = "idle"; // idle | playing | dead

let ghostY, ghostVY, ghostR, gravDir;
let score, bestScore, maxCombo, combo, lastPipeScored;
let frameCount, pipeInterval, pipeSpeed;
let activePU, puTimer, puTotalDur;
let shakeFrames, shakeMag;
let lastTime;
let floatParticles, particles;

/** @type {{x,gapTop,color,orb}[]} */
let pipes;

function getLS(k, def) { try { return parseInt(localStorage.getItem(k) || String(def), 10); } catch { return def; } }
function setLS(k, v)   { try { localStorage.setItem(k, String(v)); } catch {} }

bestScore = getLS("fk_best", 0);

function initState() {
  ghostY      = LOGICAL_H / 2;
  ghostVY     = 0;
  ghostR      = GHOST_R;
  gravDir     = 1;
  score       = 0;
  maxCombo    = 0;
  combo       = 1;
  lastPipeScored = false;
  frameCount  = 0;
  pipeInterval = 90;
  pipeSpeed    = BASE_SPEED;
  activePU     = null;
  puTimer      = 0;
  puTotalDur   = 1;
  shakeFrames  = 0;
  shakeMag     = 0;
  pipes       = [];
  floatParticles = [];
  particles   = [];
  lastTime    = performance.now();
  spawnBuildings();
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const startScreen   = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const hudEl         = document.getElementById("hud");
const hudScore      = document.getElementById("hud-score");
const comboDisplay  = document.getElementById("combo-display");
const comboVal      = document.getElementById("combo-val");
const puDisplay     = document.getElementById("powerup-display");
const puIcon        = document.getElementById("powerup-icon");
const puBar         = document.getElementById("powerup-bar");
const finalScoreEl  = document.getElementById("final-score");
const bestScoreEl   = document.getElementById("best-score");
const maxComboEl    = document.getElementById("max-combo-val");
const comboBadgeEl  = document.getElementById("combo-badge");
const startBestEl   = document.getElementById("start-best");
const startBtn      = document.getElementById("start-btn");
const restartBtn    = document.getElementById("restart-btn");
const menuBtn       = document.getElementById("menu-btn");

// ── Input ─────────────────────────────────────────────────────────────────────
let flapPending = false;
let lastFlapTime = 0;

function registerFlap() {
  const now = performance.now();
  if (now - lastFlapTime < 80) return; // debounce
  lastFlapTime = now;
  if (STATE === "idle")  { startGame(); return; }
  if (STATE === "dead")  return;
  flapPending = true;
}

document.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); registerFlap(); } });
canvas.addEventListener("click",      () => registerFlap());
canvas.addEventListener("touchstart", e  => { e.preventDefault(); registerFlap(); }, { passive: false });
startBtn.addEventListener("click",   e  => { e.stopPropagation(); startGame(); });
restartBtn.addEventListener("click", e  => { e.stopPropagation(); startGame(); });
menuBtn.addEventListener("click",    e  => { e.stopPropagation(); showMenu(); });

function showMenu() {
  STATE = "idle";
  gameoverScreen.classList.add("hidden");
  hudEl.classList.add("hidden");
  startScreen.classList.remove("hidden");
  updateStartBest();
}

function updateStartBest() {
  startBestEl.textContent = bestScore > 0 ? `Best score: ${bestScore}` : "";
}

// ── Parallax cityscape ────────────────────────────────────────────────────────
const BUILDING_LAYERS = [
  { count: 10, speedMult: 0.18, minH: 40, maxH: 100, color: "rgba(20,10,50,0.9)",  y: 0.80 },
  { count: 14, speedMult: 0.32, minH: 60, maxH: 140, color: "rgba(40,20,80,0.85)", y: 0.72 },
  { count: 18, speedMult: 0.55, minH: 80, maxH: 160, color: "rgba(60,30,100,0.8)", y: 0.64 },
];

let buildingLayers = [];

function spawnBuildings() {
  buildingLayers = BUILDING_LAYERS.map(cfg => {
    const bw = LOGICAL_W / cfg.count;
    return {
      cfg,
      buildings: Array.from({ length: cfg.count + 2 }, (_, i) => ({
        x: i * bw,
        w: bw - 2,
        h: cfg.minH + Math.random() * (cfg.maxH - cfg.minH),
        windows: Array.from({ length: Math.floor(Math.random() * 6 + 2) }, () => ({
          wx: Math.random(), wy: Math.random(), lit: Math.random() > 0.4,
        })),
      })),
      offset: 0,
    };
  });
}

function updateBuildings(speed) {
  for (const layer of buildingLayers) {
    layer.offset += speed * layer.cfg.speedMult;
    const bw = LOGICAL_W / layer.cfg.count;
    if (layer.offset >= bw) {
      layer.offset -= bw;
      // recycle first building to end
      const b = layer.buildings.shift();
      b.x = layer.buildings[layer.buildings.length - 1].x + bw;
      b.h = layer.cfg.minH + Math.random() * (layer.cfg.maxH - layer.cfg.minH);
      b.windows = Array.from({ length: Math.floor(Math.random() * 6 + 2) }, () => ({
        wx: Math.random(), wy: Math.random(), lit: Math.random() > 0.4,
      }));
      layer.buildings.push(b);
    }
  }
}

function drawBuildings() {
  for (const layer of buildingLayers) {
    const baseY = layer.cfg.y * LOGICAL_H;
    for (const b of layer.buildings) {
      const bx = b.x - layer.offset;
      ctx.fillStyle = layer.cfg.color;
      ctx.fillRect(bx, baseY - b.h, b.w, b.h);
      // windows
      for (const w of b.windows) {
        ctx.fillStyle = w.lit ? `rgba(255,240,160,0.55)` : "rgba(0,0,0,0.3)";
        ctx.fillRect(bx + w.wx * (b.w - 6) + 2, baseY - b.h + w.wy * (b.h - 8) + 4, 4, 4);
      }
    }
  }
}

// ── Pipes (laser gate style) ───────────────────────────────────────────────────
const PIPE_COLORS = [
  ["#7c3aed", "#a78bfa"],
  ["#1d4ed8", "#60a5fa"],
  ["#065f46", "#34d399"],
  ["#92400e", "#fbbf24"],
];

function spawnPipe() {
  const minTop = 70, maxTop = LOGICAL_H - GAP_H - 70;
  const gapTop = minTop + Math.random() * (maxTop - minTop);
  const [fill, glow] = PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)];

  // maybe spawn a power-up orb inside the gap
  const orbType = Math.random() < 0.25
    ? ["shield","rocket","mini","flip"][Math.floor(Math.random() * 4)]
    : null;

  pipes.push({
    x: LOGICAL_W + 10,
    gapTop,
    fill, glow,
    scored: false,
    orb: orbType ? {
      type: orbType,
      y: gapTop + GAP_H / 2,
      r: 12,
      collected: false,
      pulse: Math.random() * Math.PI * 2,
    } : null,
  });
}

function drawPipe(p) {
  const gapBot = p.gapTop + GAP_H;

  function drawSlab(x, y, w, h) {
    // body
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0,   "rgba(0,0,0,0.3)");
    grad.addColorStop(0.15, p.fill);
    grad.addColorStop(0.85, p.fill);
    grad.addColorStop(1,   "rgba(0,0,0,0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // glow edge lines
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1.5, y + 0.5, w - 3, h - 1);

    // inner highlight stripe
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(x + 4, y, 6, h);
  }

  // top pipe
  drawSlab(p.x, 0, PIPE_W, p.gapTop);
  // cap
  const capW = PIPE_W + 12, capH = 20;
  ctx.fillStyle = p.glow;
  ctx.shadowColor = p.glow;
  ctx.shadowBlur  = 10;
  ctx.fillRect(p.x - 6, p.gapTop - capH, capW, capH);
  ctx.shadowBlur = 0;

  // bottom pipe
  drawSlab(p.x, gapBot, PIPE_W, LOGICAL_H - gapBot);
  // cap
  ctx.fillStyle = p.glow;
  ctx.shadowColor = p.glow;
  ctx.shadowBlur  = 10;
  ctx.fillRect(p.x - 6, gapBot, capW, capH);
  ctx.shadowBlur = 0;

  // laser beam across gap
  const mx = p.x + PIPE_W / 2;
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.08 * Math.sin(frameCount * 0.12);
  ctx.strokeStyle = p.glow;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, p.gapTop); ctx.lineTo(mx, gapBot); ctx.stroke();
  ctx.restore();
}

function drawOrb(orb, px) {
  if (orb.collected) return;
  orb.pulse += 0.07;
  const pulse = Math.sin(orb.pulse) * 0.18 + 1;
  const cx = px + PIPE_W / 2;
  const col = PU_COLORS[orb.type];

  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur  = 16;
  const g = ctx.createRadialGradient(cx, orb.y, 0, cx, orb.y, orb.r * pulse);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.35, col);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, orb.y, orb.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${orb.r}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(PU_ICONS[orb.type], cx, orb.y);
  ctx.restore();
}

// ── Ghost ─────────────────────────────────────────────────────────────────────
let ghostTailTimer = 0;

function drawGhost(y) {
  const r     = ghostR;
  const angle = Math.max(-0.5, Math.min(0.8, ghostVY * gravDir * 0.05));
  const alpha = activePU === "shield" ? 0.7 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(GHOST_X, y);
  ctx.rotate(angle);

  // trail
  ghostTailTimer++;
  if (ghostTailTimer % 3 === 0) {
    floatParticles.push({ x: GHOST_X - r, y, vx: -1.5 - Math.random(), vy: (Math.random()-0.5)*0.8, life:1, col:"rgba(167,139,250," });
  }

  // glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 8);
  const glowCol = activePU === "shield" ? "#60a5fa"
                : activePU === "rocket" ? "#f59e0b"
                : activePU === "mini"   ? "#34d399"
                : activePU === "flip"   ? "#f472b6"
                : "#a78bfa";
  glow.addColorStop(0,   glowCol + "55");
  glow.addColorStop(0.5, glowCol + "22");
  glow.addColorStop(1,   glowCol + "00");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI*2); ctx.fill();

  // body
  ctx.fillStyle = "#e9d5ff";
  ctx.beginPath();
  ctx.arc(0, -r*0.1, r, Math.PI, 0, false);
  ctx.lineTo(r, r*0.5);
  const w = r;
  ctx.quadraticCurveTo( w*0.67, r*0.85,  w*0.33, r*0.5);
  ctx.quadraticCurveTo( 0,      r*0.85, -w*0.33, r*0.5);
  ctx.quadraticCurveTo(-w*0.67, r*0.85, -w,      r*0.5);
  ctx.closePath();
  ctx.fill();

  // face
  ctx.fillStyle = "#4c1d95";
  ctx.beginPath(); ctx.ellipse(-r*0.35, -r*0.2, r*0.22, r*0.28, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( r*0.35, -r*0.2, r*0.22, r*0.28, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-r*0.28, -r*0.26, r*0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( r*0.42, -r*0.26, r*0.1, 0, Math.PI*2); ctx.fill();

  // rocket flame
  if (activePU === "rocket") {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(-r - 10 - Math.random()*6, r*0.5);
    ctx.lineTo(-r, r*0.8);
    ctx.closePath();
    ctx.fill();
  }
  // shield ring
  if (activePU === "shield") {
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(frameCount * 0.2);
    ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI*2); ctx.stroke();
  }

  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────────────────────
function spawnExplosion(x, y, col) {
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      decay: 0.04 + Math.random() * 0.04,
      r: 2 + Math.random() * 4,
      col,
    });
  }
}

function spawnScoreParticle(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    particles.push({ x, y, vx: Math.cos(a)*3, vy: Math.sin(a)*3 - 1, life:1, decay:0.05, r:3, col:"#fbbf24" });
  }
}

function updateParticles() {
  for (const p of particles)       { p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=p.decay; }
  for (const p of floatParticles)  { p.x+=p.vx; p.y+=p.vy; p.life-=0.06; }
  particles      = particles.filter(p => p.life > 0);
  floatParticles = floatParticles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of floatParticles) {
    ctx.globalAlpha = p.life * 0.6;
    ctx.fillStyle   = p.col + (p.life * 0.5).toFixed(2) + ")";
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Background ────────────────────────────────────────────────────────────────
let bgStars = Array.from({ length: 60 }, () => ({
  x: Math.random() * LOGICAL_W,
  y: Math.random() * LOGICAL_H * 0.6,
  r: Math.random() * 1.2 + 0.3,
  twinkle: Math.random() * Math.PI * 2,
}));

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  grad.addColorStop(0,    "#080010");
  grad.addColorStop(0.45, "#0d0728");
  grad.addColorStop(0.75, "#120840");
  grad.addColorStop(1,    "#1a0a30");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // stars
  for (const s of bgStars) {
    s.twinkle += 0.025;
    ctx.globalAlpha = 0.4 + 0.35 * Math.sin(s.twinkle);
    ctx.fillStyle   = "#fff";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // aurora band
  const auroraY = LOGICAL_H * 0.38;
  const ag = ctx.createLinearGradient(0, auroraY - 30, 0, auroraY + 30);
  ag.addColorStop(0, "rgba(0,0,0,0)");
  ag.addColorStop(0.5, `rgba(100,50,200,${0.05 + 0.03*Math.sin(frameCount*0.02)})`);
  ag.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ag;
  ctx.fillRect(0, auroraY - 30, LOGICAL_W, 60);
}

function drawGround() {
  const gy = LOGICAL_H - 6;
  ctx.fillStyle = "#1e0a50";
  ctx.fillRect(0, gy, LOGICAL_W, 6);
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(0, gy, LOGICAL_W, 1.5);
}

// ── Power-up logic ────────────────────────────────────────────────────────────
function activatePowerup(type) {
  activePU   = type;
  puTimer    = PU_DURATION[type];
  puTotalDur = PU_DURATION[type];
  if (type === "mini")   ghostR = GHOST_R * 0.5;
  if (type === "flip")   { gravDir = -1; ghostVY = FLAP_FORCE * 0.6; }
  puIcon.textContent = PU_ICONS[type];
  puDisplay.classList.remove("hidden");
  sfxPowerup();
}

function clearPowerup() {
  activePU = null;
  ghostR   = GHOST_R;
  gravDir  = 1;
  puDisplay.classList.add("hidden");
}

// ── Collision ─────────────────────────────────────────────────────────────────
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx+rw));
  const ny = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx-nx, dy = cy-ny;
  return dx*dx + dy*dy < cr*cr;
}

function checkCollision() {
  if (activePU === "shield" || activePU === "rocket") return false;
  if (ghostY + ghostR >= LOGICAL_H || ghostY - ghostR <= 0) return true;
  for (const p of pipes) {
    const cr = ghostR - 3;
    if (circleRect(GHOST_X, ghostY, cr, p.x, 0, PIPE_W, p.gapTop)) return true;
    if (circleRect(GHOST_X, ghostY, cr, p.x, p.gapTop+GAP_H, PIPE_W, LOGICAL_H)) return true;
  }
  return false;
}

// ── Game lifecycle ────────────────────────────────────────────────────────────
function startGame() {
  if (AC.state === "suspended") AC.resume();
  initState();
  STATE = "playing";
  startScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  hudEl.classList.remove("hidden");
  hudScore.textContent = "0";
  comboDisplay.classList.add("hidden");
  puDisplay.classList.add("hidden");
  requestAnimationFrame(gameLoop);
}

function endGame() {
  STATE = "dead";
  sfxHit();
  spawnExplosion(GHOST_X, ghostY, "#a78bfa");
  shakeFrames = 18; shakeMag = 8;

  if (score > bestScore) { bestScore = score; setLS("fk_best", bestScore); }

  setTimeout(() => {
    finalScoreEl.textContent = score;
    bestScoreEl.textContent  = bestScore;
    if (maxCombo >= 3) {
      maxComboEl.textContent = maxCombo;
      comboBadgeEl.classList.remove("hidden");
    } else {
      comboBadgeEl.classList.add("hidden");
    }
    hudEl.classList.add("hidden");
    gameoverScreen.classList.remove("hidden");
    updateStartBest();
  }, 500);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let animId = null;

function gameLoop(ts) {
  if (STATE !== "playing") return;

  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  update(dt);
  render();

  animId = requestAnimationFrame(gameLoop);
}

function update(dt) {
  frameCount++;

  // flap input
  if (flapPending) {
    flapPending = false;
    ghostVY = FLAP_FORCE * gravDir;
    sfxFlap();
  }

  // physics
  ghostVY += GRAVITY * gravDir;
  ghostVY  = Math.max(-12, Math.min(12, ghostVY));
  ghostY  += ghostVY;

  // power-up timer
  if (activePU) {
    puTimer -= dt;
    puBar.style.width = Math.max(0, puTimer / puTotalDur * 100) + "%";
    if (puTimer <= 0) clearPowerup();
  }

  // difficulty ramp
  pipeSpeed    = BASE_SPEED + score * 0.04;
  pipeInterval = Math.max(55, 90 - score * 0.4);

  // spawn
  if (frameCount % Math.round(pipeInterval) === 0) spawnPipe();

  // move pipes + scoring + orb collection
  for (const p of pipes) {
    p.x -= pipeSpeed;

    // score
    if (!p.scored && p.x + PIPE_W < GHOST_X) {
      p.scored = true;
      score++;
      hudScore.textContent = score;
      spawnScoreParticle(GHOST_X, ghostY - 30);

      combo++;
      if (combo > 1) {
        comboVal.textContent = combo;
        comboDisplay.classList.remove("hidden");
        // re-trigger animation
        comboDisplay.style.animation = "none";
        void comboDisplay.offsetWidth;
        comboDisplay.style.animation = "";
        if (combo > maxCombo) maxCombo = combo;
        sfxCombo();
      } else {
        sfxScore();
      }
    }

    // reset combo if they passed a pipe without consecutive success
    if (p.scored && !lastPipeScored && score > 0) { combo = 1; comboDisplay.classList.add("hidden"); }
    if (p.scored) lastPipeScored = true;

    // orb collection
    if (p.orb && !p.orb.collected) {
      const cx = p.x + PIPE_W / 2, cy = p.orb.y;
      const dx = GHOST_X - cx, dy = ghostY - cy;
      if (dx*dx + dy*dy < (ghostR + p.orb.r) * (ghostR + p.orb.r)) {
        p.orb.collected = true;
        activatePowerup(p.orb.type);
        spawnExplosion(cx, cy, PU_COLORS[p.orb.type]);
      }
    }
  }

  pipes = pipes.filter(p => p.x + PIPE_W + 20 > 0);

  // buildings
  updateBuildings(pipeSpeed);

  // particles
  updateParticles();

  // shake decay
  if (shakeFrames > 0) shakeFrames--;

  // collision
  if (checkCollision()) {
    endGame();
    render(); // final frame
  }
}

function render() {
  ctx.save();

  // screen shake
  if (shakeFrames > 0) {
    const s = shakeMag * (shakeFrames / 18);
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
    if (shakeFrames < 4) shakeMag *= 0.7;
  }

  drawBackground();
  drawBuildings();

  for (const p of pipes) {
    drawPipe(p);
    if (p.orb) drawOrb(p.orb, p.x);
  }

  drawParticles();
  drawGhost(ghostY);
  drawGround();

  ctx.restore();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
initState();
updateStartBest();
// draw idle frame
render();
