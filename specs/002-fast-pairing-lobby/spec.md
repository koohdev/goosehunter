# Feature Specification: Instant QR Pairing & Clean Lobby Indicator on Vercel

**Feature Directory**: `specs/002-fast-pairing-lobby`  
**Created**: 2026-08-30  
**Status**: Ready for Planning  
**Input**: User description: "https://goosehunter.vercel.app/ its now on vercel. our application / game. the generating room QR takes longer, it might not be working nor properly configure or etc.. and the waiting for smartphone connection icon, dont make it jump or animate."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Room Session & QR Code Display (Priority: P1)

When a player navigates to the game URL on desktop (e.g. `https://goosehunter.vercel.app`), the pairing lobby immediately displays a 4-character room code and a fully generated pairing QR code without any perceptual delay or loading freeze.

**Why this priority**: Fast initial presentation is critical for user engagement. Any delay or hanging state in rendering the QR code gives the perception of a broken or unresponsive application.

**Independent Test**: Can be tested by loading the desktop landing page in a fresh browser session and verifying that the room code and pairing QR code appear immediately (under 200ms) without getting stuck on a loading placeholder.

**Acceptance Scenarios**:
1. **Given** a user opens the desktop application URL, **When** the page renders, **Then** a unique room session ID (e.g., `ABCD`) is generated synchronously and displayed immediately.
2. **Given** the room session ID is ready, **When** the pairing box renders, **Then** the QR code image is generated and displayed without waiting for asynchronous signaling handshakes to finish.
3. **Given** the user views the pairing box, **When** examining the full direct link, **Then** the URL matches the active deployed domain (e.g., `https://goosehunter.vercel.app/controller?session=<CODE>`) and offers a one-tap copy button.

---

### User Story 2 - Resilient Cross-Network Controller Pairing (Priority: P1)

A player scans the displayed QR code with their mobile device camera or opens the direct link. The smartphone controller instantly resolves the room session, prompts for gyroscope motion permissions, and establishes a direct, low-latency control channel to the host desktop regardless of the network setup (Wi-Fi, cellular, symmetric NAT).

**Why this priority**: Cross-device motion gameplay requires a robust and immediate connection channel across different networks when hosted on cloud platforms like Vercel.

**Independent Test**: Can be tested by opening the desktop page on desktop Wi-Fi and opening the controller URL on a smartphone connected via cellular data, verifying that connection succeeds and motion streaming commences upon calibration.

**Acceptance Scenarios**:
1. **Given** a smartphone opens the controller URL containing a valid session parameter, **When** the page loads, **Then** it automatically connects to the host session and displays the motion permission/calibration step.
2. **Given** the mobile controller establishes connection, **When** the user taps "Calibrate Center Origin", **Then** the desktop immediately receives the signal, transitions into the game arena, and tracks real-time motion and trigger inputs.
3. **Given** an invalid or expired room code is entered on mobile, **When** connection fails or times out (within 10 seconds), **Then** a clear, non-blocking error message is presented with a one-tap retry option.

---

### User Story 3 - Clean & Static Lobby Connection Indicator (Priority: P2)

In the desktop pairing lobby, the connection status indicator reflects the live state cleanly and subtly without disruptive jumping, bouncing, or pulsating icon animations.

**Why this priority**: Visual polish and clarity. Animated bouncing icons create visual noise and distract from the clean arcade aesthetic.

**Independent Test**: Can be tested by observing the "Waiting for smartphone connection..." status indicator in the pairing lobby to verify the icon and text remain static, readable, and non-bouncing.

**Acceptance Scenarios**:
1. **Given** the lobby is awaiting a mobile connection, **When** the status badge renders, **Then** the smartphone icon is displayed statically without `animate-bounce` or distracting motion effects.
2. **Given** a smartphone connects, **When** the status updates, **Then** the badge transitions to a static green confirmation state ("Controller Connected! Calibrating on phone...").

---

## Functional Requirements

- **FR-1**: The desktop application must generate a unique 4-character room session ID immediately upon component mount.
- **FR-2**: The QR code must be rendered within 200ms of page load using the client's current `window.location.origin` without blocking on background network signaling.
- **FR-3**: The WebRTC peer signaling layer must use high-availability public STUN servers to ensure NAT traversal across heterogeneous networks (Wi-Fi to 4G/5G).
- **FR-4**: The pairing lobby status area must use static icons without jumping, bouncing, or continuous vertical motion animations.
- **FR-5**: The mobile controller must auto-connect upon loading if a `session` query parameter is present in the URL.
- **FR-6**: The connection lifecycle must provide explicit state feedback: Waiting for Controller -> Connected (Calibrating) -> In Game.

---

## Key Entities & Data Flow

- **GameSession**:
  - `sessionId`: 4-character alphanumeric uppercase string (e.g. `K9M2`)
  - `status`: `'LOBBY' | 'CALIBRATING' | 'PLAYING' | 'ROUND_WON' | 'GAME_OVER'`
  - `joinUrl`: Full HTTPS link `https://<domain>/controller?session=<sessionId>`
- **ConnectionPayload**:
  - `aim`: Normalized coordinates `(x, y)` in range $[-1.0, 1.0]$
  - `trigger`: Fire action with timestamp
  - `command`: Game progression actions (`START`, `NEXT_LEVEL`, `RESTART`)

---

## Assumptions & Defaults

1. **Domain Detection**: The application dynamically reads `window.location.origin` so it functions identically on local development (`http://localhost:3000`), preview deployments, and custom production domains (`https://goosehunter.vercel.app`).
2. **STUN Resolution**: Standard public STUN endpoints (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`) provide sufficient NAT discovery for standard mobile cellular and residential Wi-Fi networks.
3. **Sensor Security**: The application runs under HTTPS on Vercel, satisfying mobile browser security requirements for `DeviceOrientationEvent.requestPermission()`.

---

## Success Criteria *(measurable & technology-agnostic)*

1. **Instant QR Rendering**: The pairing QR code and room code appear on the desktop screen in **less than 200 milliseconds** after initial page render.
2. **Subtle UI Presentation**: The lobby waiting indicator contains zero jumping/bouncing animations, remaining completely static.
3. **Cross-Network Pairing Success**: Mobile controllers connecting over different networks (e.g., 4G/5G mobile data to residential Wi-Fi desktop) successfully establish a motion channel in **under 3 seconds**.
4. **Zero Serverless 404 Errors**: Zero network polling requests fail with HTTP 404 on Vercel deployments.
