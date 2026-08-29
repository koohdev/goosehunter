'use client';

import type { Peer as PeerType, DataConnection } from 'peerjs';

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

interface PeerErrorWithCode extends Error {
  type?: string;
}

// ----------------------------------------------------
// 1. Host Channel (Desktop Arena / Lobby)
// ----------------------------------------------------
export class HostRealtimeChannel implements RealtimeChannel {
  private peer: PeerType | null = null;
  private connection: DataConnection | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  public sessionId: string = '';
  public isConnected: boolean = false;
  private isDestroyed: boolean = false;

  constructor() {
    this.init();
  }

  private async init(preferredId?: string) {
    if (typeof window === 'undefined') return;

    try {
      const { default: Peer } = await import('peerjs');
      if (this.isDestroyed) return;

      const code = (preferredId || generateSessionCode()).toUpperCase();
      this.sessionId = code;
      const peerId = `goose-hunter-room-${code}`;

      const peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer = peer;

      peer.on('open', () => {
        this.isConnected = true;
        this.dispatch('connect', {});
        this.dispatch('room:created', {
          sessionId: this.sessionId,
          hostUrl: typeof window !== 'undefined' ? window.location.origin : '',
        });
      });

      peer.on('connection', (conn) => {
        // If an existing connection exists, close it or replace
        if (this.connection) {
          try {
            this.connection.close();
          } catch {
            // ignore
          }
        }

        this.connection = conn;

        conn.on('open', () => {
          conn.send({ type: 'room:joined', sessionId: this.sessionId });
          this.dispatch('controller:connected', { controllerId: conn.peer });
        });

        conn.on('data', (raw: unknown) => {
          if (!raw || typeof raw !== 'object') return;
          const message = raw as Record<string, unknown>;
          const { type, ...payload } = message;

          if (typeof type === 'string') {
            // Map controller messages to host events
            if (type === 'motion:aim') {
              this.dispatch('aim:update', payload);
            } else if (type === 'controller:trigger') {
              this.dispatch('trigger:fired', payload);
            } else if (type === 'controller:calibrated') {
              this.dispatch('controller:calibrated', payload);
            } else if (type === 'game:command') {
              this.dispatch('game:sync', payload);
            } else {
              this.dispatch(type, payload);
            }
          }
        });

        conn.on('close', () => {
          this.connection = null;
          this.dispatch('controller:disconnected', {});
        });

        conn.on('error', (err) => {
          console.warn('[Host WebRTC] Connection error:', err);
        });
      });

      peer.on('error', (err: unknown) => {
        const pErr = err as PeerErrorWithCode;
        // If ID is taken, retry with new code
        if (pErr?.type === 'unavailable-id') {
          console.log('[Host WebRTC] Room ID occupied, generating new session ID...');
          peer.destroy();
          this.init();
        } else {
          console.warn('[Host WebRTC] Peer error:', err);
        }
      });
    } catch (err) {
      console.error('[Host WebRTC] Initialization failed:', err);
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
      if (this.sessionId && this.isConnected) {
        this.dispatch('room:created', {
          sessionId: this.sessionId,
          hostUrl: typeof window !== 'undefined' ? window.location.origin : '',
        });
      }
      return;
    }

    // Send game updates to mobile controller via WebRTC DataChannel
    if (this.connection && this.connection.open) {
      this.connection.send({ type: event, ...data });
    }
  }

  public resetRoom() {
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // ignore
      }
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
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
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // ignore
      }
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }
}

// ----------------------------------------------------
// 2. Controller Channel (Mobile Light Gun)
// ----------------------------------------------------
export class ControllerRealtimeChannel implements RealtimeChannel {
  private peer: PeerType | null = null;
  private connection: DataConnection | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  public sessionId: string = '';
  public isConnected: boolean = false;
  private isDestroyed: boolean = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId.toUpperCase().trim();
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined' || !this.sessionId) return;

    try {
      const { default: Peer } = await import('peerjs');
      if (this.isDestroyed) return;

      const peer = new Peer({
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer = peer;

      peer.on('open', () => {
        this.connectToHost();
      });

      peer.on('error', (err: unknown) => {
        const pErr = err as PeerErrorWithCode;
        console.warn('[Controller WebRTC] Peer error:', err);
        if (pErr?.type === 'peer-unavailable') {
          this.dispatch('room:error', {
            message: `Room "${this.sessionId}" was not found or has expired. Make sure the desktop screen is open.`,
          });
        }
      });
    } catch (err) {
      console.error('[Controller WebRTC] Init failed:', err);
    }
  }

  private connectToHost() {
    if (!this.peer || !this.sessionId) return;

    const hostPeerId = `goose-hunter-room-${this.sessionId}`;
    const conn = this.peer.connect(hostPeerId, {
      reliable: true,
    });

    this.connection = conn;

    conn.on('open', () => {
      this.isConnected = true;
      this.dispatch('connect', {});
      this.dispatch('room:joined', { sessionId: this.sessionId });
      conn.send({ type: 'room:join', sessionId: this.sessionId });
    });

    conn.on('data', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const message = raw as Record<string, unknown>;
      const { type, ...payload } = message;
      if (typeof type === 'string') {
        this.dispatch(type, payload);
      }
    });

    conn.on('close', () => {
      this.isConnected = false;
      this.dispatch('disconnect', {});
      this.dispatch('room:error', { message: 'Desktop host disconnected.' });
    });

    conn.on('error', (err) => {
      console.warn('[Controller WebRTC] Connection error:', err);
      this.dispatch('room:error', { message: 'Failed to connect to host room.' });
    });
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
        this.connectToHost();
      } else if (this.connection && this.connection.open) {
        this.connection.send({ type: 'room:join', sessionId: this.sessionId });
      }
      return;
    }

    // Direct streaming over WebRTC
    if (this.connection && this.connection.open) {
      this.connection.send({ type: event, ...data });
    }
  }

  public connect() {
    if (!this.isConnected) {
      if (this.peer && !this.peer.destroyed) {
        this.connectToHost();
      } else {
        this.init();
      }
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
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // ignore
      }
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
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
