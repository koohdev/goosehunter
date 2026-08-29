# Quickstart Validation Guide: Motion-Controlled Multi-Screen Duck Shooter

**Feature**: `001-motion-goose-hunter`  
**Date**: 2026-08-30  

## Prerequisites
- Node.js 18+ / 20+ installed
- Desktop browser (Chrome / Firefox / Edge / Safari)
- Smartphone connected to same local Wi-Fi or accessible network address (or second browser tab simulating mobile)

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   (Runs Next.js + WebSocket server on `http://localhost:3000` or local IP `http://192.168.x.x:3000`).

## End-to-End Validation Scenarios

### Scenario 1: QR Code Session Pairing
1. Open `http://localhost:3000` on Desktop browser.
2. Confirm a unique Session Code and QR Code render clearly.
3. Open `http://localhost:3000/controller/[sessionId]` on mobile (or a separate mobile-emulated browser window).
4. Verify desktop screen immediately transitions from "Waiting for Controller..." to "Connected & Calibrated".

### Scenario 2: Motion Aiming & Touch Trigger
1. On the mobile screen, tap "Calibrate" while pointing at monitor.
2. Tilt the smartphone up/down and left/right. Confirm crosshair on desktop moves smoothly.
3. Tap the mobile trigger pad. Confirm:
   - Mobile produces subtle vibration & trigger sound.
   - Desktop displays muzzle flash, plays gunshot sound, and decrements bullet counter from 10 to 9.

### Scenario 3: Target Hit & Level Progression
1. Aim reticle over a flying Black Goose (5 pts), Blue Goose (10 pts), or Red Goose (15 pts) and tap trigger.
2. Verify bird switches to falling animation, score increases, and hit count increments.
3. Reach level target score (e.g. 60 points in Level 1) within 10 bullets to confirm "Congratulations! You Proceed to the Next Level" victory modal.

### Scenario 4: Solo Mouse Play Mode
1. Click "Play with Mouse" button on Desktop.
2. Move mouse to aim and left-click to fire. Confirm full solo arcade playability.
