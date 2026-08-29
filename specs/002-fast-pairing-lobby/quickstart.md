# Quickstart & Validation Guide: Instant QR Pairing & WebRTC Lobby

**Feature**: `002-fast-pairing-lobby`  
**Date**: 2026-08-30  

## Prerequisites
- Node.js 20+
- Modern desktop browser & mobile device (or dual browser windows)

## Running the Application
```bash
npm run dev
# or for production test:
npm run build && npm run start
```

## Validation Scenarios

### 1. Instant QR Code Rendering Test
1. Navigate to `http://localhost:3000` (or `https://goosehunter.vercel.app/`).
2. Verify the 4-character Room Code and QR Code image render **immediately (<200ms)** without getting stuck on "Generating Room QR...".
3. Verify the "Waiting for smartphone connection..." icon is **static** and not bouncing/jumping.

### 2. Dual-Window / Mobile Pairing Test
1. Click the "Copy Link" button or scan the QR code.
2. Open the controller link in a separate window or smartphone browser.
3. Verify the controller immediately displays the permission/calibration screen.
4. Tap "Calibrate Center Origin" on the controller.
5. Verify the desktop view seamlessly transitions into the active game arena.
6. Verify crosshair motion and trigger clicks track with zero lag.
