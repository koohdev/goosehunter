# Contract: WebRTC PeerJS Event Protocol

**Feature**: `002-fast-pairing-lobby`  
**Date**: 2026-08-30  

## Peer Identification

- **Host (Desktop Arena)**: `gh-room-${sessionId.toLowerCase()}`
- **Controller (Mobile)**: Auto-generated ephemeral Peer ID

## Events Matrix

| Direction | Event Name | Payload | Description |
|:---|:---|:---|:---|
| Host $\rightarrow$ Controller | `room:joined` | `{ sessionId: string }` | Confirms controller successfully joined active host room |
| Controller $\rightarrow$ Host | `controller:calibrated` | `{ sessionId: string }` | Signals mobile calibration finished; triggers desktop arena start |
| Controller $\rightarrow$ Host | `aim:update` | `{ sessionId: string, x: number, y: number, timestamp: number }` | Real-time normalized crosshair coordinates $[-1.0, 1.0]$ |
| Controller $\rightarrow$ Host | `trigger:fired` | `{ sessionId: string, x: number, y: number, timestamp: number }` | Trigger press event with aim position |
| Host $\leftrightarrow$ Controller | `game:sync` | `{ action?, status?, score?, bullets?, level? }` | Bidirectional state and command sync |
| System | `controller:disconnected` | - | Controller data channel closed |
| System | `host:disconnected` | - | Host data channel closed |
| System | `room:error` | `{ message: string }` | Error details (timeout, invalid room code) |
