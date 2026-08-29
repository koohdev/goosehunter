# Implementation Plan: Motion-Controlled Multi-Screen Duck Shooter (Goose Hunter)

**Branch**: `001-motion-goose-hunter` | **Date**: 2026-08-30 | **Spec**: [`spec.md`](spec.md)

**Input**: Feature specification from [`specs/001-motion-goose-hunter/spec.md`](spec.md)

## Summary

Build a cross-device motion-controlled web arcade game inspired by *Duck Hunt* ("Goose Hunter"). The desktop display renders the retro 2D pixel-art arena, animated geese, hitboxes, scoring, and HUD. The smartphone acts as a wireless light gun via `DeviceOrientationEvent` gyroscope tracking and touch trigger firing, connected over low-latency WebSockets (Socket.io). Includes 5 progressive difficulty levels, 10 bullets per round, 3 geese varieties (Black: 5pts, Blue: 10pts, Red: 15pts), retro sound effects, and desktop mouse solo fallback mode.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Socket.io, `qrcode` / `qrcode.react`, Lucide React  
**Storage**: Client-side LocalStorage for High Scores and Session tokens  
**Testing**: Manual End-to-End browser validation, Unit testing of math/hit detection/score matrices  
**Target Platform**: Modern Desktop Browsers (Chrome, Edge, Firefox, Safari) + Mobile Browsers (iOS Safari 13+, Android Chrome 80+)  
**Project Type**: Multi-Screen Web Application (Desktop Host Arena + Mobile Motion Controller + Real-Time WebSocket Server)  
**Performance Goals**: 60 FPS HTML5 Canvas rendering, $<50\text{ ms}$ input-to-render motion latency  
**Constraints**: Zero installation, cross-platform orientation sensor compatibility, iOS gesture permission compliance, pixelated retro 8-bit aesthetic  
**Scale/Scope**: 5 Game Levels, 3 Goose Variants, 10 Bullets/Round, Dual-Screen Real-Time Pairing  

## Constitution Check

*GATE: Passed. Architecture adheres to clean separation of concerns, lightweight rendering, robust motion calibration, and testable interfaces.*

## Project Structure

### Documentation (this feature)

```text
specs/001-motion-goose-hunter/
├── plan.md              # Implementation Plan
├── research.md          # Architecture & Technical Research
├── data-model.md        # Entities, Enums, State Transitions
├── quickstart.md        # Validation & Run Guide
├── contracts/           # Protocol and API Contracts
│   ├── websocket-protocol.md
│   ├── game-engine-api.md
│   └── mobile-controller-api.md
└── tasks.md             # Sequenced Implementation Tasks
```

### Source Code Structure

```text
goosehunter/
├── server.mjs                  # Custom Node HTTP server integrating Next.js + Socket.io
├── public/
│   ├── images/                 # Sprites (geese, crosshairs, backgrounds, bullets, hud)
│   └── sounds/                 # Sound effects (gunshot, hit, beng, click, powerup)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root Layout & metadata
│   │   ├── globals.css         # Retro styles, CRT scanlines, pixel fonts
│   │   ├── page.tsx            # Desktop Display Game Arena & QR Lobby
│   │   ├── controller/
│   │   │   └── page.tsx        # Mobile Controller Client with Gyroscope & Trigger
│   │   └── api/
│   │       └── session/route.ts # REST fallback for session creation
│   ├── components/
│   │   ├── DesktopArena.tsx    # 2D Canvas Game Arena Component
│   │   ├── QrPairingLobby.tsx  # Session QR Code Display & Instructions
│   │   ├── MobileController.tsx # Mobile Gun UI, Calibration & Trigger Pad
│   │   ├── ArcadeHUD.tsx       # Retro Scoreboard, Bullets & Level Info
│   │   └── VictoryModal.tsx    # Round Victory / Next Level / Game Over Modals
│   ├── engine/
│   │   ├── GameEngine.ts       # Canvas 2D Game Loop, Physics, Targets, Bullets
│   │   ├── GooseManager.ts     # Target spawning, flight paths, flap animation, hits
│   │   ├── AudioManager.ts     # Web Audio API Sound Synthesizer & FX Player
│   │   └── LevelManager.ts     # Levels 1-5 definitions, quotas, speeds
│   ├── lib/
│   │   ├── socket-client.ts    # Socket.io client wrapper & event emitters
│   │   ├── motion-sensor.ts    # DeviceOrientation listener, calibration & EMA filter
│   │   └── types.ts            # Shared TypeScript interfaces & types
└── package.json
```

## Structure Decision

A unified Next.js + Socket.io project layout (`server.mjs`) allows single-command startup (`npm run dev`) that hosts both the Desktop Host page (`/`), the Mobile Controller page (`/controller`), and the low-latency WebSocket signaling room server on the exact same port.
