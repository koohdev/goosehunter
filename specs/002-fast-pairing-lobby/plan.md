# Implementation Plan: Instant QR Pairing & Clean Lobby Indicator on Vercel

**Branch**: `002-fast-pairing-lobby` | **Date**: 2026-08-30 | **Spec**: [`spec.md`](spec.md)

**Input**: Feature specification from [`specs/002-fast-pairing-lobby/spec.md`](spec.md)

## Summary

Optimize the pairing lobby and cross-device network connection for instant, zero-delay rendering on Vercel deployments. Guarantees that the room code and QR code render under 200ms by decoupling session generation from async peer broker handshakes. Configures multi-provider STUN NAT traversal for high-reliability mobile-to-desktop WebRTC pairing across different networks. Removes distracting bouncy/jumping animations on the lobby waiting indicator for a clean, polished arcade aesthetic.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, `peerjs`, `qrcode`, `lucide-react`, Tailwind CSS 4  
**Architecture**: Decentralized Browser-to-Browser WebRTC DataChannels over public STUN servers  
**Deployment**: Vercel Static & Edge hosting (Zero Node.js server dependencies)  
**Target Platform**: Modern Desktop Browsers + Mobile Browsers (iOS Safari 13+, Android Chrome 80+)  
**Performance Goals**: $<200\text{ ms}$ QR render on page load, $<50\text{ ms}$ motion streaming latency  

## Constitution Check

*GATE: Passed. Architecture completely eliminates server-side persistent socket bottlenecks, achieves instant visual loading, and adheres to strict React 19 hydration safety.*

## Project Structure

### Documentation (this feature)

```text
specs/002-fast-pairing-lobby/
├── spec.md              # Feature Specification
├── plan.md              # Implementation Plan
├── research.md          # Architecture & Technical Research
├── data-model.md        # Entities, Enums, State Transitions
├── quickstart.md        # Validation & Run Guide
├── contracts/           # Protocol and API Contracts
│   └── webrtc-protocol.md
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
goosehunter/
├── src/
│   ├── lib/
│   │   ├── webrtc-client.ts    # Instant room creation microtask & STUN fallback
│   │   └── socket-client.ts    # Re-export WebRTC client
│   ├── app/
│   │   ├── layout.tsx          # suppressHydrationWarning for extension safety
│   │   ├── page.tsx            # Direct event subscription before room:create
│   │   └── controller/
│   │       └── page.tsx        # Auto-join session query param
│   └── components/
│       ├── QrPairingLobby.tsx  # Static non-bouncing icons & useSyncExternalStore
│       ├── MobileController.tsx # Direct room:join emitter & orientation handler
│       └── DesktopArena.tsx    # WebRTC stream consumer
└── package.json
```
