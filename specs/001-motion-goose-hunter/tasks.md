# Implementation Tasks: Motion-Controlled Multi-Screen Duck Shooter (Goose Hunter)

**Feature**: `001-motion-goose-hunter`  
**Plan**: [`plan.md`](plan.md)  
**Spec**: [`spec.md`](spec.md)  

## Phase 1: Setup & Shared Infrastructure

**Purpose**: Project initialization, dependency installation, asset ingestion, and shared types.

- [X] T001 Install runtime dependencies (`socket.io`, `socket.io-client`, `qrcode`, `qrcode.react`, `lucide-react`, `canvas-confetti`) in package.json
- [X] T002 Copy game sprite assets from `images/` into `public/images/` and organize folders
- [X] T003 Copy audio files from `../UPDATES - BIRDHUNTER/Sounds/` into `public/sounds/`
- [X] T004 Define shared TypeScript interfaces and enums in `src/lib/types.ts`
- [X] T005 Create custom Node + Next.js WebSocket server script in `server.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core real-time networking, audio synthesizer, and canvas engine foundations.

- [X] T006 Implement client-side Socket.io connector in `src/lib/socket-client.ts`
- [X] T007 Implement Web Audio sound synthesizer and audio asset player in `src/engine/AudioManager.ts`
- [X] T008 Implement level parameters and progression matrix (Levels 1-5) in `src/engine/LevelManager.ts`
- [X] T009 Implement base retro HUD component layout and styling in `src/components/ArcadeHUD.tsx`

---

## Phase 3: User Story 1 - Cross-Device Session Pairing & Motion Calibration (Priority: P1) 🎯 MVP

**Goal**: Enable desktop to generate a unique room QR code and allow mobile phone to scan, connect, request motion sensor permissions, and calibrate neutral aiming center.

**Independent Test**: Load desktop page, scan QR on smartphone, grant sensors, tap "Calibrate", and verify desktop confirms player connected with crosshair centered.

### Implementation for User Story 1

- [X] T010 [P] [US1] Create QR Code lobby and pairing card component in `src/components/QrPairingLobby.tsx`
- [X] T011 [P] [US1] Implement device orientation permission request and calibration logic in `src/lib/motion-sensor.ts`
- [X] T012 [US1] Build mobile pairing and calibration UI in `src/components/MobileController.tsx`
- [X] T013 [US1] Implement mobile controller route entry page in `src/app/controller/page.tsx`
- [X] T014 [US1] Integrate room creation and controller connection listeners into desktop page in `src/app/page.tsx`

---

## Phase 4: User Story 2 - Real-Time Motion Aiming & Touch Trigger (Priority: P1)

**Goal**: Translate physical phone motion (pitch & yaw) into smooth desktop crosshair tracking ($<50\text{ ms}$) and fire shots with haptic recoil upon tapping mobile screen.

**Independent Test**: Tilt smartphone to verify crosshair follows motion smoothly across monitor, tap trigger pad to confirm haptic vibration and gunshot flash.

### Implementation for User Story 2

- [X] T015 [P] [US2] Implement Exponential Moving Average (EMA) smoothing and coordinate normalization in `src/lib/motion-sensor.ts`
- [X] T016 [P] [US2] Implement touch trigger pad, recoil animation, and vibration feedback in `src/components/MobileController.tsx`
- [X] T017 [US2] Implement reticle rendering, clamping, and muzzle flash effects in `src/engine/GameEngine.ts`
- [X] T018 [US2] Implement real-time aim and trigger event bridging between socket and canvas in `src/components/DesktopArena.tsx`

---

## Phase 5: User Story 3 - Arcade Target Shooting & Scoring Mechanics (Priority: P2)

**Goal**: Spawn flying Black (5pts), Blue (10pts), and Red (15pts) geese with flight paths, 10 bullets per round, bounding-box hit detection, and real-time HUD scoring.

**Independent Test**: Spawn geese, aim crosshair over them, fire bullets, and verify bullet deduction, hit falling animations, points awarded, and miss counter.

### Implementation for User Story 3

- [X] T019 [P] [US3] Implement goose target spawner, flight physics, and flapping animation cycles in `src/engine/GooseManager.ts`
- [X] T020 [US3] Implement hit detection collision tests and hit/falling transitions in `src/engine/GameEngine.ts`
- [X] T021 [US3] Connect 10-bullet deduction, hit/miss scoring, and HUD updates in `src/components/DesktopArena.tsx`
- [X] T022 [US3] Implement floating point indicators (+5, +10, +15) and gunshot impact sparks in `src/engine/GameEngine.ts`

---

## Phase 6: User Story 4 - Multi-Level Progression & Game Over States (Priority: P2)

**Goal**: Enforce 5 difficulty levels with increasing point quotas (60, 70, 80, 90, 100), extra geese on level 3 and 5, victory/next level transitions, and game over restart flows.

**Independent Test**: Complete level 1 with $\ge 60$ points to see Next Level modal; fail to reach quota to see Game Over modal and restart.

### Implementation for User Story 4

- [X] T023 [P] [US4] Create round victory and game over modal components in `src/components/VictoryModal.tsx`
- [X] T024 [US4] Implement level progression evaluation and round transition triggers in `src/engine/LevelManager.ts`
- [X] T025 [US4] Synchronize level completion and restart actions across mobile and desktop in `src/app/page.tsx`

---

## Phase 7: User Story 5 - Standalone Desktop Mouse Mode & Audio/Settings (Priority: P3)

**Goal**: Support direct mouse aiming and click shooting for solo desktop play without requiring a phone, plus audio mute controls.

**Independent Test**: Click "Play with Mouse", move cursor to aim, left-click to shoot, and toggle sound effects.

### Implementation for User Story 5

- [X] T026 [P] [US5] Implement desktop mouse move and click listeners for solo mode in `src/components/DesktopArena.tsx`
- [X] T027 [US5] Implement audio toggle and solo mode switchers in `src/components/ArcadeHUD.tsx`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Visual styling, CRT scanline overlay, retro typography, and build verification.

- [X] T028 [P] Add retro arcade CRT scanline and glowing border effects in `src/app/globals.css`
- [X] T029 Add high score persistence to LocalStorage in `src/engine/LevelManager.ts`
- [X] T030 Build project and verify end-to-end functionality per `quickstart.md`
