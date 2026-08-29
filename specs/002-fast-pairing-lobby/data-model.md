# Data Model: Instant QR Pairing & WebRTC Lobby

**Feature**: `002-fast-pairing-lobby`  
**Date**: 2026-08-30  

## Entities & Interfaces

### 1. Room Session
```typescript
interface RoomSession {
  sessionId: string;          // 4-character uppercase alphanumeric (e.g. 'K7X2')
  peerId: string;             // WebRTC Peer identifier: 'gh-room-' + sessionId.toLowerCase()
  status: 'LOBBY' | 'CALIBRATING' | 'PLAYING' | 'ROUND_WON' | 'GAME_OVER';
  controllerConnected: boolean;
  createdAt: number;
}
```

### 2. Network Messages (WebRTC DataChannel)
```typescript
type WebRTCMessage =
  | { event: 'room:joined'; data: { sessionId: string } }
  | { event: 'controller:connected'; data: { controllerId: string } }
  | { event: 'controller:calibrated'; data: { sessionId: string } }
  | { event: 'aim:update'; data: { sessionId: string; x: number; y: number; timestamp: number } }
  | { event: 'trigger:fired'; data: { sessionId: string; x: number; y: number; timestamp: number } }
  | { event: 'game:sync'; data: { action?: string; status?: string; score?: number; bullets?: number; level?: number } }
  | { event: 'controller:disconnected'; data?: undefined }
  | { event: 'host:disconnected'; data?: undefined }
  | { event: 'room:error'; data: { message: string } };
```

### 3. Lobby UI State
```typescript
interface LobbyUIState {
  sessionId: string;
  qrDataUrl: string;
  joinUrl: string;
  isClient: boolean;
  copied: boolean;
  controllerConnected: boolean;
}
```

## State Transitions

```
[Page Load]
     │ (0ms Synchronous ID generation)
     ▼
[LOBBY: Static Waiting Badge + Instant QR Code Displayed]
     │ (Mobile scans QR & connects via WebRTC DataChannel)
     ▼
[CALIBRATING: Badge switches to Emerald "Controller Connected!"]
     │ (User points at screen & taps Calibrate)
     ▼
[PLAYING: Desktop Arena Loaded, 60 FPS Aim Streaming Active]
```
