# Feature Specification: Motion-Controlled Multi-Screen Duck Shooter (Goose Hunter)

**Feature Branch**: `001-motion-goose-hunter`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Motion-Controlled Multi-Screen Duck Shooter - An interactive, cross-device web arcade game inspired by classic light-gun shooters like Duck Hunt. Players pair their smartphone with a desktop screen using a simple QR code, transforming the phone into a real-time motion controller to aim and shoot targets displayed on the monitor."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cross-Device Session Pairing & Motion Calibration (Priority: P1)

A player opens the game on a desktop monitor, sees a room QR code and pairing code, and scans the QR code with their smartphone. The smartphone opens the mobile controller web client, prompts the user for motion sensor permissions, and presents a calibration screen where pointing at the desktop center establishes the neutral aiming origin.

**Why this priority**: Without seamless pairing and orientation calibration, motion-controlled crosshair aiming is impossible. This is the foundational prerequisite for the multi-screen arcade experience.

**Independent Test**: Can be tested independently by launching the host display, scanning the QR code on a smartphone, granting sensor permissions, and confirming the smartphone enters "Connected & Calibrated" state while the desktop updates to show player connected.

**Acceptance Scenarios**:

1. **Given** a player opens the game on a desktop display, **When** the page loads, **Then** a unique room session ID is generated and displayed alongside a scannable QR code and direct join link.
2. **Given** a player scans the QR code with a mobile device, **When** the mobile web page loads, **Then** it prompts for motion/orientation sensor access and connects to the matching desktop session.
3. **Given** sensor permissions are granted on the mobile device, **When** the player aims at the monitor and taps "Calibrate", **Then** the current physical orientation is recorded as the center origin $(0, 0)$, and the controller enters active gameplay mode.
4. **Given** the mobile controller is connected, **When** the desktop receives the calibration event, **Then** the desktop transitions from the pairing lobby into the game arena with the crosshair centered.

---

### User Story 2 - Real-Time Motion Aiming & Touch Trigger (Priority: P1)

With the mobile controller paired, the player tilts and pitches their smartphone in physical space to steer the aiming reticle across the desktop monitor in real time. Tapping the trigger area on the mobile screen instantly fires a shot, producing immediate visual, audio, and haptic feedback on both devices.

**Why this priority**: Core motion aiming and trigger response is the defining interaction mechanic of the light-gun arcade concept.

**Independent Test**: Can be tested by moving the smartphone and tapping the trigger to verify continuous crosshair movement across the monitor boundaries and immediate shot firing with recoil feedback.

**Acceptance Scenarios**:

1. **Given** an active gameplay session, **When** the player pitches (up/down) or yaws (left/right) the smartphone, **Then** the desktop crosshair moves smoothly and proportionally across the desktop screen with sub-50ms perceived latency.
2. **Given** the mobile controller interface, **When** the player taps the primary trigger pad, **Then** a fire event is transmitted immediately to the desktop host, a gunshot sound plays, visual muzzle flash is rendered, and the mobile device triggers haptic vibration.
3. **Given** the crosshair reaches screen edges, **When** the player continues tilting outward, **Then** the crosshair clamps cleanly within the visible game arena without disappearing or wrapping around.
4. **Given** orientation drift occurs during play, **When** the player taps the persistent "Quick Calibrate" / "Re-center" button on mobile, **Then** the current orientation is instantly re-zeroed to the screen center.

---

### User Story 3 - Arcade Target Shooting & Scoring Mechanics (Priority: P2)

The desktop arena spawns flying geese of varying types across 8-bit retro forest/swamp environments. The player is given 10 bullets per round to shoot flying targets before they escape, earning points based on target color and type.

**Why this priority**: Delivers the complete core gameplay loop, scoring structure, and classic Duck Hunt nostalgia.

**Independent Test**: Can be tested by spawning geese, aiming the crosshair over their hitboxes, firing shots, and verifying correct score increments, bullet deduction, and hit animations.

**Acceptance Scenarios**:

1. **Given** a round starts, **When** geese take flight from the terrain, **Then** they animate and fly across the sky in dynamic flight paths (straight, diagonal, erratic arcs).
2. **Given** 10 bullets allocated per round, **When** a shot is fired, **Then** the remaining bullet counter decreases by 1 and the missed shot counter updates if no goose is struck.
3. **Given** the crosshair overlaps a flying goose when a shot is fired, **When** hit detection executes, **Then** the goose transitions to a hit/falling animation, plays a success sound, drops to the ground, and awards points:
   - Black Goose: +5 points
   - Blue Goose: +10 points
   - Red Goose: +15 points
4. **Given** an active game, **When** targets are hit or missed, **Then** the HUD real-time counters (Shots Remaining, Missed Shots, Current Score, High Score) update immediately.

---

### User Story 4 - Multi-Level Progression & Game Over States (Priority: P2)

The game features progressive difficulty across 5 distinct levels with increasing score thresholds, faster geese speeds, and additional concurrent targets. When a round finishes, the game evaluates whether the player met the required quota to advance or triggered a Game Over.

**Why this priority**: Provides motivation, replayability, and challenge progression for the player.

**Independent Test**: Can be tested by completing rounds with scores above and below the required thresholds for levels 1 through 5, verifying round victory modals, level transitions, and game over screens.

**Acceptance Scenarios**:

1. **Given** Level 1 through 5 specifications, **When** a player advances, **Then** the level parameters apply:
   - Level 1: Target Score 60 Points
   - Level 2: Target Score 70 Points
   - Level 3: Target Score 80 Points (+1 Extra Goose per wave)
   - Level 4: Target Score 90 Points
   - Level 5: Target Score 100 Points (+2 Extra Geese per wave)
2. **Given** a round concludes (all bullets spent or all wave targets resolved), **When** the player's score meets or exceeds the level target score, **Then** a "Congratulations! You Proceed to the Next Level" victory screen appears with options to proceed ("Next Level") or restart.
3. **Given** a round concludes, **When** the player's score is below the level target score, **Then** a "Game Over" screen displays the final score, missed shots, and provides a "Restart" button.
4. **Given** a new high score is achieved, **When** the round ends, **Then** the high score is updated and persisted for the session.

---

### User Story 5 - Standalone Desktop Mouse Mode & Audio/Settings Controls (Priority: P3)

If a mobile device is not connected or a player prefers desktop-only play, the game supports direct mouse-aiming and mouse-click shooting. Both desktop and mobile interfaces provide audio toggles and intuitive menu navigation.

**Why this priority**: Enhances accessibility, testing convenience, and allows single-device play without requiring a second screen.

**Independent Test**: Can be tested on desktop alone by selecting "Play with Mouse", moving the mouse cursor to aim, and clicking to shoot.

**Acceptance Scenarios**:

1. **Given** the desktop landing page, **When** the player chooses "Play with Mouse (Solo Mode)", **Then** the game launches directly using the desktop mouse for crosshair aiming and left-click for shooting.
2. **Given** gameplay is active, **When** the audio toggle button is clicked, **Then** background music and sound effects mute or unmute seamlessly.
3. **Given** mobile controller mode is active, **When** the player navigates menus on mobile or desktop, **Then** navigation actions (Restart, Next Level, Back) synchronize across screens.

---

### Edge Cases

- **Mobile Motion Permission Denied**: If the mobile user denies motion sensor permissions, display a clear instructional modal explaining how to re-enable permissions in browser settings, along with an on-screen touch joystick fallback.
- **Connection Interruption / Backgrounding**: If the mobile browser is minimized or network connection drops, the desktop pauses the game and displays a "Controller Disconnected - Reconnecting..." overlay. When the phone re-opens, the session auto-resumes without losing round score.
- **Orientation Gyroscope Drift**: Physical sensors naturally drift over time. A prominent, high-contrast "Calibrate / Re-center" button is permanently available on the mobile touch interface for zero-friction re-centering at any moment.
- **Exhausted Bullets with Geese in Flight**: When the 10th bullet is fired, remaining geese continue flying offscreen before the round score is calculated and the victory/game-over modal is displayed.
- **Screen Boundary & Aspect Ratio Differences**: Reticle coordinate calculations map normalized relative coordinates $([-1, 1], [-1, 1])$ to the desktop canvas aspect ratio regardless of physical display size.
- **Rapid Tap / Misfire Prevention**: The mobile trigger pad prevents accidental multi-touch spam while allowing crisp, responsive single-shot cadence matching gun animation timings.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a unique room session ID upon desktop launch and render a scannable QR code containing the pairing URL.
- **FR-002**: Mobile client MUST establish real-time, low-latency bidirectional communication with the corresponding desktop session.
- **FR-003**: Mobile client MUST request device orientation and motion permissions following platform-compliant user gesture workflows.
- **FR-004**: Mobile client MUST provide an orientation calibration mechanism that defines the player's neutral forward-facing posture as $(0, 0)$.
- **FR-005**: Mobile client MUST stream orientation delta coordinates to the desktop display at a minimum of 60 updates per second when active.
- **FR-006**: Desktop display MUST translate received orientation stream into continuous, smoothed crosshair positions clamped within visible game arena bounds.
- **FR-007**: Mobile client MUST provide a large, responsive touch trigger surface that transmits instant fire trigger events upon touch.
- **FR-008**: Mobile client MUST trigger physical haptic feedback (vibration) upon firing a shot on supported devices.
- **FR-009**: Desktop display MUST render retro 8-bit visual environments, animated geese sprites, crosshairs, muzzle flash, and hit reaction animations.
- **FR-010**: Desktop display MUST provide retro sound effects for gunshots, target hits, misses, round transitions, and ambient audio with mute controls.
- **FR-011**: System MUST allocate exactly 10 bullets per round and deduct 1 bullet per trigger pull.
- **FR-012**: System MUST compute geometric bounding-box hit detection between the crosshair reticle and active geese sprites upon each trigger event.
- **FR-013**: System MUST award 5 points for Black Goose hits, 10 points for Blue Goose hits, and 15 points for Red Goose hits.
- **FR-014**: System MUST display an arcade HUD showing Shots Remaining, Missed Shots, Current Score, and High Score in real time.
- **FR-015**: System MUST enforce 5 escalating difficulty levels with target score quotas (Level 1: 60pts, Level 2: 70pts, Level 3: 80pts, Level 4: 90pts, Level 5: 100pts) and increasing geese counts/speeds.
- **FR-016**: System MUST present level victory screens with "Next Level" progression upon reaching the quota, or "Game Over" with restart options if the quota is not met.
- **FR-017**: Desktop client MUST support an optional standalone mouse aiming and firing mode without requiring a mobile controller.
- **FR-018**: System MUST gracefully handle mobile disconnection, displaying a re-pairing prompt and preserving game session state.

### Key Entities

- **Game Session**: Represents a paired play instance; contains unique Session ID, room token, host connection state, controller connection state, and active game status (Lobby, Playing, Paused, RoundSummary, GameOver).
- **Controller State**: Represents the mobile controller client; contains orientation calibration offsets (pitch, yaw, roll reference), current orientation angles, connection health, and trigger event timestamps.
- **Target Goose**: Represents a flying target in the arena; contains target type (`Black`, `Blue`, `Red`), point value (`5`, `10`, `15`), speed multiplier, flight trajectory vector, animation frame state, and life status (`Spawning`, `Flying`, `Hit_Falling`, `Escaped`).
- **Level Configuration**: Defines round parameters; contains level index (1 to 5), score goal (60 to 100), spawn count, simultaneous active target limit, flight speed range, and background environment theme.
- **Round Score Record**: Tracks player performance during a round; contains total bullets allocated (10), bullets remaining, shots fired, hits count by target type, missed shots count, current score, and high score.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can pair their smartphone to the desktop screen via QR code scan in under 5 seconds.
- **SC-002**: Reticle motion responds to smartphone movement with sub-50 millisecond perceived input latency over local Wi-Fi or standard network connections.
- **SC-003**: 100% of valid trigger presses register instant visual muzzle flash, audio feedback, and haptic vibration without dropped inputs.
- **SC-004**: Hit detection evaluates with 100% mathematical accuracy against visible sprite boundaries at the instant of firing.
- **SC-005**: Game state synchronization between mobile trigger and desktop display maintains zero desync across all 5 game levels.
- **SC-006**: First-time players can calibrate their phone and understand the aiming mechanism within 10 seconds of scanning the QR code without external instructions.

---

## Assumptions

- Target mobile devices are modern smartphones (iOS Safari 13+ / Android Chrome 80+) equipped with standard gyroscope and accelerometer hardware sensors.
- Desktop display and mobile controller have active internet / local network connectivity for WebSocket or WebRTC peer-to-peer data transport.
- On iOS devices, motion sensor permissions require a user-initiated touch gesture (e.g. tapping "Calibrate" or "Start").
- Haptic vibration utilizes the standard web vibration capability on supported mobile browsers (gracefully inert on platforms where vibration is restricted).
- The game uses 2D pixel-art visual assets and audio effects optimized for 60 FPS HTML5 canvas / web rendering.
