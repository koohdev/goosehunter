# Tasks: Instant QR Pairing & Clean Lobby Indicator on Vercel

**Feature Directory**: `specs/002-fast-pairing-lobby`  
**Input**: Feature specification [`spec.md`](spec.md) and implementation plan [`plan.md`](plan.md)  

## Phase 1: Setup & Dependencies

- [x] T001 Configure `peerjs` dependencies and standard Next.js build scripts in `package.json`

## Phase 2: Foundational Network Layer

- [x] T002 Implement WebRTC Network Client with microtask room generation and STUN servers in `src/lib/webrtc-client.ts`
- [x] T003 [P] Re-export WebRTC client compatibility adapter in `src/lib/socket-client.ts`

## Phase 3: User Story 1 - Instant Room Session & QR Code Display (Priority: P1)

*Goal: Ensure the desktop page displays the 4-character room code and pairing QR code under 200ms on load.*

- [x] T004 [US1] Implement direct event subscription and room creation in `src/app/page.tsx`
- [x] T005 [P] [US1] Render QR code and copy link with `useSyncExternalStore` in `src/components/QrPairingLobby.tsx`

## Phase 4: User Story 2 - Resilient Cross-Network Controller Pairing (Priority: P1)

*Goal: Mobile device connects to desktop over WebRTC DataChannels across heterogeneous networks (Wi-Fi/cellular).*

- [x] T006 [P] [US2] Implement auto-joining and session input handling in `src/app/controller/page.tsx`
- [x] T007 [US2] Implement WebRTC controller connection and orientation streaming in `src/components/MobileController.tsx`
- [x] T008 [US2] Connect desktop game arena to WebRTC motion updates and trigger shots in `src/components/DesktopArena.tsx`

## Phase 5: User Story 3 - Clean & Static Lobby Connection Indicator (Priority: P2)

*Goal: Remove jumping/bouncing animations on the waiting status icon in the pairing lobby.*

- [x] T009 [US3] Remove `animate-bounce` from the smartphone connection icon in `src/components/QrPairingLobby.tsx`

## Phase 6: Polish & Quality Assurance

- [x] T010 Add `suppressHydrationWarning` on `<html>` and `<body>` in `src/app/layout.tsx`
- [x] T011 Run linter and verify zero ESLint errors via `npm run lint`
- [x] T012 Run production build and verify static route generation via `npm run build`

## Dependencies

```
T001 (Setup)
  └── T002, T003 (Foundational Network)
        ├── T004, T005 (US1: Instant QR)
        ├── T006, T007, T008 (US2: P2P Pairing)
        └── T009 (US3: Static Lobby Indicator)
              └── T010, T011, T012 (Polish & Build Verification)
```
