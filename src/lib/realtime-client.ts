'use client';

import type { Room, DataPayload } from 'trystero';

export type RealtimeEventHandler = (data: Record<string, unknown>) => void;

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export interface RealtimeChannel {
  on(event: string, handler: RealtimeEventHandler): void;
  off(event: string, handler: RealtimeEventHandler): void;
  emit(event: string, data?: Record<string, unknown>): void;
  disconnect(): void;
  readonly isConnected: boolean;
  readonly sessionId: string;
}

// ----------------------------------------------------
// 1. Host Channel (Desktop Arena / Lobby)
// ----------------------------------------------------
export class HostRealtimeChannel implements RealtimeChannel {
  private room: Room | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  public sessionId: string = '';
  public isConnected: boolean = false;
  private isDestroyed: boolean = false;

  // Action senders
  private sendGameSync: ((data: DataPayload) => Promise<void>) | null = null;

  constructor() {
    this.init();
  }

  private async init(preferredId?: string) {
    if (typeof window === 'undefined') return;

    try {
      const { joinRoom } = await import('trystero');
      if (this.isDestroyed) return;

      const code = (preferredId || generateSessionCode()).toUpperCase();
      this.sessionId = code;
      const roomId = `goose-hunter-room-${code}`;

      const room = joinRoom(
        {
          appId: 'goose-hunter-motion-arcade-v1',
        },
        roomId
      );

      this.room = room;
      this.isConnected = true;

      // Register actions
      const aimAction = room.makeAction('aim');
      const triggerAction = room.makeAction('trigger');
      const calibratedAction = room.makeAction('calibrated');
      const gameSyncAction = room.makeAction('gameSync');
      const gameCommandAction = room.makeAction('gameCommand');

      this.sendGameSync = (data) => gameSyncAction.send(data);

      aimAction.onMessage = (data) => {
        this.dispatch('aim:update', data as Record<string, unknown>);
      };

      triggerAction.onMessage = (data) => {
        this.dispatch('trigger:fired', data as Record<string, unknown>);
      };

      calibratedAction.onMessage = (data) => {
        this.dispatch('controller:calibrated', data as Record<string, unknown>);
      };

      gameSyncAction.onMessage = (data) => {
        this.dispatch('game:sync', data as Record<string, unknown>);
      };

      gameCommandAction.onMessage = (data) => {
        this.dispatch('game:sync', data as Record<string, unknown>);
      };

      room.onPeerJoin = (peerId: string) => {
        this.dispatch('controller:connected', { controllerId: peerId });
      };

      room.onPeerLeave = (peerId: string) => {
        this.dispatch('controller:disconnected', { controllerId: peerId });
      };

      this.dispatch('connect', {});
      this.dispatch('room:created', {
        sessionId: this.sessionId,
        hostUrl: typeof window !== 'undefined' ? window.location.origin : '',
      });
    } catch (err) {
      console.error('[Host Realtime] Initialization error:', err);
    }
  }

  public on(event: string, handler: RealtimeEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  public off(event: string, handler: RealtimeEventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  public emit(event: string, data: Record<string, unknown> = {}) {
    if (event === 'room:create') {
      if (this.sessionId) {
        this.dispatch('room:created', {
          sessionId: this.sessionId,
          hostUrl: typeof window !== 'undefined' ? window.location.origin : '',
        });
      }
      return;
    }

    if (event === 'game:sync' || event === 'game:command') {
      if (this.sendGameSync) {
        this.sendGameSync(data as unknown as DataPayload).catch(() => {});
      }
    }
  }

  public resetRoom() {
    if (this.room) {
      try {
        this.room.leave().catch(() => {});
      } catch {
        // ignore
      }
      this.room = null;
    }
    this.isConnected = false;
    this.init();
  }

  private dispatch(event: string, data: Record<string, unknown>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[Host Realtime] Error in handler for "${event}":`, e);
        }
      });
    }
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.room) {
      try {
        this.room.leave().catch(() => {});
      } catch {
        // ignore
      }
      this.room = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }
}

// ----------------------------------------------------
// 2. Controller Channel (Mobile Light Gun)
// ----------------------------------------------------
export class ControllerRealtimeChannel implements RealtimeChannel {
  private room: Room | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  public sessionId: string = '';
  public isConnected: boolean = false;
  private isDestroyed: boolean = false;

  // Action senders
  private sendAim: ((data: DataPayload) => Promise<void>) | null = null;
  private sendTrigger: ((data: DataPayload) => Promise<void>) | null = null;
  private sendCalibrated: ((data: DataPayload) => Promise<void>) | null = null;
  private sendGameCommand: ((data: DataPayload) => Promise<void>) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId.toUpperCase().trim();
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined' || !this.sessionId) return;

    try {
      const { joinRoom } = await import('trystero');
      if (this.isDestroyed) return;

      const roomId = `goose-hunter-room-${this.sessionId}`;

      const room = joinRoom(
        {
          appId: 'goose-hunter-motion-arcade-v1',
        },
        roomId
      );

      this.room = room;

      // Register actions
      const aimAction = room.makeAction('aim');
      const triggerAction = room.makeAction('trigger');
      const calibratedAction = room.makeAction('calibrated');
      const gameSyncAction = room.makeAction('gameSync');
      const gameCommandAction = room.makeAction('gameCommand');

      this.sendAim = (data) => aimAction.send(data);
      this.sendTrigger = (data) => triggerAction.send(data);
      this.sendCalibrated = (data) => calibratedAction.send(data);
      this.sendGameCommand = (data) => gameCommandAction.send(data);

      gameSyncAction.onMessage = (data) => {
        this.dispatch('game:sync', data as Record<string, unknown>);
      };

      room.onPeerJoin = (peerId: string) => {
        this.isConnected = true;
        this.dispatch('connect', { peerId });
        this.dispatch('room:joined', { sessionId: this.sessionId, hostId: peerId });
      };

      room.onPeerLeave = (peerId: string) => {
        this.isConnected = false;
        this.dispatch('disconnect', { peerId });
        this.dispatch('room:error', { message: 'Desktop host disconnected.' });
      };

      // Optimistic connect trigger
      this.dispatch('connect', {});
      this.dispatch('room:joined', { sessionId: this.sessionId });
    } catch (err) {
      console.error('[Controller Realtime] Init error:', err);
      this.dispatch('room:error', { message: 'Failed to connect to room.' });
    }
  }

  public on(event: string, handler: RealtimeEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  public off(event: string, handler: RealtimeEventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  public emit(event: string, data: Record<string, unknown> = {}) {
    if (event === 'room:join') {
      const targetSessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      if (targetSessionId && targetSessionId !== this.sessionId) {
        this.sessionId = targetSessionId.toUpperCase().trim();
        if (this.room) {
          this.room.leave().catch(() => {});
          this.room = null;
        }
        this.init();
      }
      return;
    }

    if (event === 'motion:aim') {
      if (this.sendAim) {
        this.sendAim(data as unknown as DataPayload).catch(() => {});
      }
      return;
    }

    if (event === 'controller:trigger') {
      if (this.sendTrigger) {
        this.sendTrigger(data as unknown as DataPayload).catch(() => {});
      }
      return;
    }

    if (event === 'controller:calibrated') {
      if (this.sendCalibrated) {
        this.sendCalibrated(data as unknown as DataPayload).catch(() => {});
      }
      return;
    }

    if (event === 'game:command') {
      if (this.sendGameCommand) {
        this.sendGameCommand(data as unknown as DataPayload).catch(() => {});
      }
      return;
    }
  }

  public connect() {
    if (!this.room) {
      this.init();
    }
  }

  private dispatch(event: string, data: Record<string, unknown>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[Controller Realtime] Error in handler for "${event}":`, e);
        }
      });
    }
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.room) {
      try {
        this.room.leave().catch(() => {});
      } catch {
        // ignore
      }
      this.room = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }
}

// Singletons for global hook usage
let hostChannelInstance: HostRealtimeChannel | null = null;
let controllerChannelInstance: ControllerRealtimeChannel | null = null;

export function getHostChannel(): HostRealtimeChannel {
  if (!hostChannelInstance) {
    hostChannelInstance = new HostRealtimeChannel();
  }
  return hostChannelInstance;
}

export function getControllerChannel(sessionId: string): ControllerRealtimeChannel {
  if (!controllerChannelInstance || controllerChannelInstance.sessionId !== sessionId) {
    if (controllerChannelInstance) {
      controllerChannelInstance.disconnect();
    }
    controllerChannelInstance = new ControllerRealtimeChannel(sessionId);
  }
  return controllerChannelInstance;
}
