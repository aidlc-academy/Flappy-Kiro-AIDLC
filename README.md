# 👻 Flappy Kiro

> An arcade browser game built with **Vanilla JavaScript**, **HTML5 Canvas**, and the **Web Audio API** — zero asset dependencies, developed following the [AI-DLC](https://github.com/aidlc-academy) methodology.

![Flappy Kiro UI](img/example-ui.png)

---

## 🎮 Overview

Flappy Kiro is a fast-paced, high-aesthetic arcade flying game. You control **Ghosty** — a ghost that drifts perpetually to the right through a neon cityscape. Tap or press Space to flap upward and navigate through laser-gated pipe walls. Collect glowing power-up orbs along the way, chain consecutive clears for combo multipliers, and see how far you can go before Ghosty hits a wall.

---

## ⚡ Power-Ups

Power-up orbs spawn inside pipe gaps at random. Fly through them to activate:

| Icon | Name | Effect | Duration |
|------|------|--------|----------|
| ◈ | **Phase Shield** | Pass through solid walls safely | 5 s |
| ▲ | **Rocket Dash** | Blast through at 3× speed — total invulnerability | 4 s |
| ● | **Mini Ghost** | Shrink to 50% size to dodge tight spaces | 7 s |
| ⇅ | **Gravity Flip** | Invert gravity — fly upside-down | 6 s |

---

## 🔥 Combo System

Clear pipe gaps consecutively without dying to stack a combo multiplier. Your max combo is shown on the Game Over screen. Chain three or more for the 🔥 combo badge.

---

## 🌟 Key Features

- **Zero Asset Dependencies** — all visuals (Ghosty, parallax cityscapes, laser pipe gates, glowing power-up orbs, particle explosions, ghost trail) and all audio (flap tone, score chime, combo hit, power-up jingle, impact thud) are 100% procedurally generated using HTML5 Canvas and the Web Audio API.
- **Parallax Cityscape** — three-layer scrolling city backdrop with randomised building silhouettes and lit windows.
- **HiDPI Rendering** — canvas scales automatically to high-DPI displays and touch screens via `devicePixelRatio`.
- **Procedural Audio** — all sound effects are synthesised on-the-fly through oscillators and gain envelopes — no audio files needed.
- **Particle System** — ghost trail particles, score burst confetti, and explosion effects on collision.
- **Screen Shake** — camera shake on death for impact feedback.
- **Difficulty Ramp** — pipe speed and spawn frequency increase as your score climbs.
- **Persistent Best Score** — saved to `localStorage` with graceful in-memory fallback.
- **Responsive** — full-viewport on mobile, fixed 400×600 card on desktop.

---

## 🏗️ Architecture

The game follows a strict 3-layer separation of concerns, as required by the AI-DLC `team-practices.md`:

```
input()    →  Event handlers write into state flags only. Zero game logic inside listeners.
update(dt) →  Pure physics, collision detection, entity state mutation. Zero Canvas API calls.
render()   →  Reads state and draws. Zero state mutation.
```

### File structure

```
aidlc-workshop/
├── index.html          ← Shell: canvas + overlay screens + HUD
├── style.css           ← Premium UI: glassmorphism overlays, animated logo, HUD
├── game.js             ← Full game engine (~600 lines, zero dependencies)
├── assets/
│   ├── ghosty.png      ← Ghost sprite (used if available; procedural fallback built-in)
│   ├── jump.wav        ← Flap sound  (used if available; procedural fallback built-in)
│   └── game_over.wav   ← Death sound (used if available; procedural fallback built-in)
├── img/
│   └── example-ui.png  ← UI reference screenshot
└── README.md
```

### Physics

| Parameter | Value | Notes |
|-----------|-------|-------|
| Gravity | 0.42 px/frame² | Applied every frame in the direction of `gravDir` |
| Flap force | −9.2 px/frame | Inverted when Gravity Flip is active |
| Base pipe speed | 2.6 px/frame | Increases by 0.04 per point scored |
| Pipe interval | 90 frames → 55 frames | Decreases by 0.4 per point, capped at 55 |
| Gap height | 155 px | Fixed |
| Ghost radius | 18 px (normal) / 9 px (Mini) | Used for circle-vs-rect collision |

### Collision detection

Circle-vs-axis-aligned-rectangle test:

```js
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx-nx)**2 + (cy-ny)**2 < cr*cr;
}
```

Shield and Rocket power-ups bypass collision entirely.

---

## 🚀 How to Run

No build step, no dependencies, no server required.

**Option 1 — Open directly:**
```
Double-click index.html
```

**Option 2 — Local server (avoids audio autoplay policy on some browsers):**
```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve .
```
Then open `http://localhost:8000`.

---

## 🕹️ Controls

| Action | Input |
|--------|-------|
| Flap / Start | `Space` |
| Flap / Start | Mouse click |
| Flap / Start | Screen tap (touch) |

---

## 🧪 Development Notes

- The game targets **60 fps** via `requestAnimationFrame`. The `update(dt)` function receives a delta-time cap of 50 ms to prevent spiral-of-death on tab wake.
- The Web Audio `AudioContext` is created at page load but only resumed on the first user interaction (browser autoplay policy compliance).
- All canvas drawing uses the **logical coordinate space** (400×600). HiDPI scaling is applied once via `ctx.scale()` after `resizeCanvas()`.
- The power-up bar depletes in real wall-clock time (`dt` from `requestAnimationFrame`) rather than frames, so it is frame-rate independent.

---

## 🏛️ AI-DLC Compliance

This project was scaffolded and developed using the **AI-Driven Development Life Cycle (AI-DLC)** methodology running on the **Kiro CLI harness**. The workflow ran the following stages:

| Stage | Status |
|-------|--------|
| Intent Capture | ✅ Completed |
| Approval & Handoff | ✅ Completed |
| Practices Discovery | ✅ Completed |
| Requirements Analysis | 🔄 In Progress |
| NFR Requirements | ⏳ Pending |
| Code Generation | ⏳ Pending |
| Build & Test | ⏳ Pending |
| CI Pipeline | ⏳ Pending |
| Performance Validation | ⏳ Pending |

Workflow artefacts (state, audit trail, memory) live under `aidlc/spaces/default/intents/260912-flappy-kiro-game/`.

---

## 📄 Licence

See [LICENCE.md](LICENCE.md).

---

Built with ❤️ using **AI-DLC** & **Kiro CLI Harness**.
