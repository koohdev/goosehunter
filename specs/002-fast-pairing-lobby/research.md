# Research: Instant QR Pairing & Clean WebRTC Lobby on Vercel

**Feature**: `002-fast-pairing-lobby`  
**Date**: 2026-08-30  

## Technical Decisions

### 1. Zero-Delay Room Session & QR Generation
- **Decision**: Generate 4-character room session ID immediately upon component mount and derive QR code asynchronously via `qrcode.toDataURL` without awaiting peer broker connection.
- **Rationale**:
  - Eliminates the previous UI deadlock where `QrPairingLobby` sat in "Generating Room QR..." while waiting for a network handshake.
  - QR generation with `errorCorrectionLevel: 'M'` takes $<5\text{ ms}$, rendering the QR code instantly.
  - PeerJS initializes the host room in the background using ID `gh-room-<session_id>`, ready before the user can aim their phone camera at the screen.
- **Alternatives Considered**:
  - *Server-side API route for session generation*: Adds unnecessary HTTP network roundtrips and doesn't solve serverless state persistence.
  - *Awaiting PeerJS open event before rendering QR*: Introduces 500-1500ms network signaling delay to visual QR rendering.

---

### 2. WebRTC STUN NAT Traversal on Vercel / Cloud
- **Decision**: Configure redundant multi-provider STUN servers:
  - `stun.l.google.com:19302`
  - `stun1.l.google.com:19302`
  - `stun2.l.google.com:19302`
  - `stun.cloudflare.com:3478`
- **Rationale**:
  - Guarantees fast, reliable ICE candidate gathering across different network combinations (e.g. mobile 4G/5G carrier networks to home/office Wi-Fi).
  - WebRTC DataChannels operate with `reliable: false` (UDP-like) for 60 FPS motion aim coordinates and standard reliable messages for trigger/state events.
- **Alternatives Considered**:
  - *Custom Node.js WebSocket server*: Fails on Vercel serverless functions with HTTP 404 NOT_FOUND.
  - *HTTP Long Polling*: High latency (>100ms) and incompatible with 60 FPS motion gaming.

---

### 3. Clean & Static Connection Status Indicators
- **Decision**: Render status indicators (e.g. "Waiting for smartphone connection...") with static, high-contrast Lucide icons without `animate-bounce` or distracting motion classes.
- **Rationale**:
  - Bouncing and jumping animations create visual fatigue and distract from the retro arcade CRT theme.
  - Static indicators with clear color semantics (Amber: Waiting, Emerald: Connected) provide immediate, non-distracting feedback.
