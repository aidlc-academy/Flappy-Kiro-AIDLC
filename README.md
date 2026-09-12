# 👻 Flappy Kiro

> A neon-drenched arcade browser game built with **Vanilla JavaScript**, **HTML5 Canvas** and **Web Audio API** — zero dependencies, zero build step, 100% procedural.

[![Play Game Live](https://img.shields.io/badge/%F0%9F%8E%AE%20PLAY%20GAME%20LIVE-CLICK%20HERE-7c3aed?style=for-the-badge&logoColor=white)](https://avibeladiya.github.io/Flappy-Kiro-AIDLC/)

![Status](https://img.shields.io/badge/Status-Playable-brightgreen?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-JS%20%7C%20Canvas%20%7C%20Web%20Audio-a855f7?style=flat-square)
![Framework](https://img.shields.io/badge/Framework-AI--DLC%20v2.6-06b6d4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)

---

## 🎮 What Is This?

Guide **Ghosty** — a glowing ghost — through an endless neon cityscape. Walls scroll toward you with randomised gaps. Tap or press Space to flap upward; let go and gravity pulls you down. Every pair of walls you clear scores one point. Hit a wall or the ground and it is game over.

Collect glowing orbs inside the gaps to trigger power-ups that completely change how the game plays.

---

## ⚡ Power-Ups

| Icon | Name | What It Does | Duration |
|------|------|--------------|----------|
| ◈ | **Phase Shield** | Pass through walls — full invincibility | 5 s |
| ▲ | **Rocket Dash** | Blast forward at 3x speed, invulnerable | 4 s |
| ● | **Mini Ghost** | Shrink to half size, thread tighter gaps | 7 s |
| ⇅ | **Gravity Flip** | Invert gravity and fly upside-down | 6 s |

---

## 🔥 Combo System

Clear walls back-to-back without dying to stack a combo multiplier. Your peak combo is recorded on the Game Over screen. Hit 3 or more in a row and earn the 🔥 badge.

---

## 🌟 Features

- **Fully procedural** — every pixel and every sound is generated in code; no image or audio files required
- **Parallax cityscape** — three independent building layers scroll at different speeds behind the action
- **Particle system** — ghost trail, score burst sparks and a full explosion on death
- **Screen shake** — physics-driven camera shake on collision for impact feedback
- **Procedural audio** — Web Audio API oscillators synthesise every sound effect on the fly
- **Difficulty ramp** — pipes speed up and spawn faster as your score climbs
- **HiDPI rendering** — canvas scales with devicePixelRatio for crisp pixels on retina screens
- **Persistent high score** — saved to localStorage, falls back to memory in sandboxed environments
- **Responsive** — fills the viewport on mobile, centred card on desktop

---

## 🏗️ Architecture

Strict 3-layer separation — no layer ever touches another layer's responsibility:

```
input()     — listeners write flags into state only; zero game logic
update(dt)  — physics, collision, scoring, power-up timers; zero Canvas calls
render()    — reads state and draws; zero state mutation
```

### File Layout

```
Flappy-Kiro-AIDLC/
├── index.html      <- page shell: canvas, overlay screens, HUD elements
├── style.css       <- dark UI, glassmorphism overlays, animated logo, HUD
├── game.js         <- full engine (~600 lines); input / update / render
├── assets/
│   ├── ghosty.png  <- sprite (optional — procedural ghost drawn if absent)
│   ├── jump.wav    <- flap SFX (optional — synthesised if absent)
│   └── game_over.wav
└── README.md
```

### Physics Constants

| Parameter | Value | Note |
|-----------|-------|------|
| Gravity | 0.42 px/frame^2 | multiplied by gravDir (+-1) |
| Flap force | -9.2 px/frame | negated when Gravity Flip active |
| Base pipe speed | 2.6 px/frame | +0.04 per point scored |
| Pipe spawn interval | 90 to 55 frames | -0.4 per point, floor 55 |
| Gap height | 155 px | fixed |
| Ghost radius | 18 px to 9 px | halved during Mini Ghost |

---

## 🚀 Running Locally

No install, no build:

```bash
# just open the file
start index.html       # Windows
open index.html        # macOS
xdg-open index.html    # Linux
```

Or serve it (recommended — avoids audio autoplay restrictions):

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

---

## 🕹️ Controls

| Input | Action |
|-------|--------|
| Space | Flap / Start |
| Mouse click | Flap / Start |
| Screen tap | Flap / Start (mobile) |

---

## 🏛️ Built with AI-DLC

This project was built using the **AI-Driven Development Life Cycle** methodology on the **Kiro CLI harness**. The workflow covers: Intent Capture, Practices Discovery, Requirements Analysis, Code Generation, Build and Test, and Performance Validation.

Artefacts live under `aidlc/spaces/default/intents/260912-flappy-kiro-game/`.

---

*Made with heart using AI-DLC & Kiro CLI.*