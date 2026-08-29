# Research: Motion-Controlled Multi-Screen Duck Shooter (Goose Hunter)

**Feature**: `001-motion-goose-hunter`  
**Date**: 2026-08-30  

## Research Topics & Decisions

### 1. Cross-Device Synchronization: Socket.io vs WebRTC vs Pure WebSockets

- **Decision**: Use **Socket.io** over Node.js HTTP Server in Next.js.
- **Rationale**:
  - Provides automatic room/session management (`socket.join(room)` / `socket.to(room).emit()`), heartbeat/reconnection out of the box, and fallback transports.
  - Latency over local network / Wi-Fi is consistently $<20\text{ ms}$, well below the $<50\text{ ms}$ threshold required for motion gaming.
  - Zero external signaling infrastructure or STUN/TURN servers required compared to WebRTC.
  - Allows both the Next.js frontend pages (`/` desktop display, `/controller/[sessionId]` mobile app) and WebSocket server to run on the exact same HTTP server instance and port.
- **Alternatives Considered**:
  - *WebRTC DataChannels (PeerJS)*: Excellent latency, but requires external STUN/TURN servers, complex ICE negotiation, and higher connection failure rates on mobile cellular/firewalled Wi-Fi.
  - *Raw WebSockets (`ws`)*: Lightweight, but requires manual room handling, session routing, and reconnection logic that Socket.io already provides reliably.

---

### 2. Mobile Motion & Orientation API: Gyroscope Delta Mapping & Calibration

- **Decision**: Use the standard `DeviceOrientationEvent` with relative delta mapping from a calibrated origin $(\beta_0, \gamma_0)$ and Exponential Moving Average (EMA) smoothing.
- **Rationale**:
  - **iOS Safari Requirement**: iOS 13+ requires explicit user gesture to trigger `DeviceOrientationEvent.requestPermission()`. Must be bound to a clear UI touch (e.g. "Enable Sensors" / "Calibrate").
  - **Coordinate Mapping**:
    - **Pitch** ($\beta \in [-180, 180]$): Tilting phone up/down shifts reticle $Y$ coordinate.
    - **Roll/Yaw** ($\gamma \in [-90, 90]$): Tilting phone left/right shifts reticle $X$ coordinate.
    - **Calibration**: When user taps "Calibrate", store $(\beta_{\text{center}}, \gamma_{\text{center}}) = (\beta, \gamma)$.
    - **Normalized Output**:
      $$X_{\text{norm}} = \text{clamp}\left(\frac{\gamma - \gamma_{\text{center}}}{\text{SENSITIVITY}_X}, -1, 1\right)$$
      $$Y_{\text{norm}} = \text{clamp}\left(\frac{\beta - \beta_{\text{center}}}{\text{SENSITIVITY}_Y}, -1, 1\right)$$
  - **Smoothing Filter**: $P_t = \alpha \cdot P_{\text{raw}} + (1 - \alpha) \cdot P_{t-1}$ with $\alpha = 0.65$ eliminates hand tremors while maintaining responsive 60 FPS motion tracking.
- **Alternatives Considered**:
  - *Raw Accelerometer (`devicemotion` acceleration)*: Double integration of acceleration vectors introduces severe mathematical drift and noise. Orientation angles ($\beta, \gamma$) are sensor-fused by the OS and far more stable.

---

### 3. Rendering Engine: HTML5 Canvas 2D vs Pixi.js / Phaser

- **Decision**: Use a dedicated, modular **HTML5 Canvas 2D Engine** encapsulated in TypeScript.
- **Rationale**:
  - Zero heavy engine dependencies, instant bundle load, and full 60 FPS rendering performance.
  - Crisp pixel-art scaling via `imageSmoothingEnabled = false` and CSS pixelated rendering.
  - Direct control over sprite animation frames, layered rendering (backgrounds, terrain, animated geese, hitboxes, particle muzzle flash, HUD overlays), and coordinate projection.
  - Extremely lightweight footprint for both desktop and mobile web views.
- **Alternatives Considered**:
  - *Phaser.js / Pixi.js*: High bundle overhead (~1-2MB) and unnecessary complexity for a retro 2D arcade shooter with fixed screen arena bounds.

---

### 4. Audio & Haptic Feedback Architecture

- **Decision**: Web Audio API Sound Synthesizer with audio asset loader fallback (`Beng.MP3`, `gunshot.mp3`, `Powerup.mp3`, `Click.wav`) + `navigator.vibrate`.
- **Rationale**:
  - Instant zero-latency gunshot and hit sounds via Web Audio `AudioBufferSourceNode` or synthesized square/noise waves, avoiding browser audio element decoding delays.
  - Dual audio: Mobile phone plays local trigger click/sound + 50ms vibration recoil on touch; Desktop monitor plays spatial arcade gunshot + duck quacks/hits.
- **Alternatives Considered**:
  - *HTML5 `<audio>` tags*: High latency (100-300ms) on repeated fast trigger taps; Web Audio API unlocks sub-10ms instantaneous audio playback.

---

### 5. Level & Game Mechanics Architecture

- **Decision**: State-driven Level Progression Matrix matching specification:
  - 10 bullets per round.
  - Geese Types:
    - **Black Goose**: Speed $1.0\times$, points $5$.
    - **Blue Goose**: Speed $1.4\times$, points $10$.
    - **Red Goose**: Speed $1.8\times$, points $15$.
  - Levels:
    - **Level 1**: Quota 60 points (Winter Forest theme).
    - **Level 2**: Quota 70 points (Autumn Forest theme).
    - **Level 3**: Quota 80 points (+1 extra goose per wave) (Sunny Forest theme).
    - **Level 4**: Quota 90 points (Sunset Swamp theme).
    - **Level 5**: Quota 100 points (+2 extra geese per wave) (Dark Swamp theme).
