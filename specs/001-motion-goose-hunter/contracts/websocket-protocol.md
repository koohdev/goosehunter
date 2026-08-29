# Contract: WebSocket Event Protocol

**Feature**: `001-motion-goose-hunter`  
**Protocol Version**: 1.0  
**Transport**: Socket.io / WebSockets  

## Client to Server Events

### 1. `room:create` (Desktop Host)
- **Payload**: `{}`
- **Server Action**: Generates unique `sessionId`, registers socket as host, returns `room:created`.

### 2. `room:join` (Mobile Controller)
- **Payload**: `{ sessionId: string }`
- **Server Action**: Associates socket with existing session room, notifies host via `controller:connected`.

### 3. `motion:aim` (Mobile Controller)
- **Payload**:
  ```typescript
  {
    sessionId: string;
    x: number; // Normalized horizontal [-1.0, 1.0]
    y: number; // Normalized vertical [-1.0, 1.0]
    timestamp: number;
  }
  ```
- **Server Action**: Forwards immediately to `hostSocketId` via `aim:update`.

### 4. `controller:trigger` (Mobile Controller)
- **Payload**:
  ```typescript
  {
    sessionId: string;
    x: number;
    y: number;
    timestamp: number;
  }
  ```
- **Server Action**: Forwards immediately to `hostSocketId` via `trigger:fired`.

### 5. `controller:recalibrate` (Mobile Controller)
- **Payload**: `{ sessionId: string }`
- **Server Action**: Broadcasts `recalibrate:ack` and resets neutral origin.

### 6. `game:command` (Mobile Controller or Desktop Host)
- **Payload**: `{ sessionId: string, action: 'START' | 'NEXT_LEVEL' | 'RESTART' | 'TOGGLE_SOUND' }`
- **Server Action**: Synchronizes game state transition across both clients.

---

## Server to Client Events

### 1. `room:created`
- **Payload**: `{ sessionId: string, joinUrl: string }`

### 2. `controller:connected`
- **Payload**: `{ controllerId: string }`

### 3. `aim:update`
- **Payload**: `{ x: number, y: number, timestamp: number }`

### 4. `trigger:fired`
- **Payload**: `{ x: number, y: number, timestamp: number }`

### 5. `game:sync`
- **Payload**:
  ```typescript
  {
    level: number;
    score: number;
    bulletsRemaining: number;
    status: 'LOBBY' | 'PLAYING' | 'ROUND_WON' | 'GAME_OVER';
  }
  ```

### 6. `controller:disconnected`
- **Payload**: `{ reason: string }`
