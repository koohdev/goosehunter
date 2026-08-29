'use client';

import Peer, { DataConnection } from 'peerjs';

export type NetworkRole = 'host' | 'controller' | 'idle';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (data?: any) => void;

interface NetworkMessage {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface PeerErrorWithCode extends Error {
  type?: string;
}

const STUN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

function generateCleanSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function formatRoomPeerId(sessionId: string): string {
  return `gh-room-${sessionId.toLowerCase().trim()}`;
}

export class WebRTCNetworkClient {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private role: NetworkRole = 'idle';
  private currentSessionId: string = '';
  public connected: boolean = false;
  private joinTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    // Initialized on demand
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dispatch(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in WebRTC event handler [${event}]:`, err);
        }
      });
    }
  }

  /**
   * Host initializes a game room session
   */
  public createRoom(preferredSessionId?: string): string {
    this.destroy();
    this.role = 'host';

    const sessionId = preferredSessionId || generateCleanSessionId();
    this.currentSessionId = sessionId;
    const peerId = formatRoomPeerId(sessionId);

    // Immediately dispatch room:created on the next microtask so the UI displays the QR code instantly
    queueMicrotask(() => {
      this.dispatch('room:created', { sessionId });
    });

    try {
      this.peer = new Peer(peerId, {
        config: { iceServers: STUN_ICE_SERVERS },
        debug: 1,
      });

      this.peer.on('open', (id) => {
        console.log(`[WebRTC Host] Room opened with ID: ${id} (Session: ${sessionId})`);
        this.connected = true;
        this.dispatch('connect');
        this.dispatch('room:created', { sessionId });
      });

      this.peer.on('connection', (conn) => {
        console.log(`[WebRTC Host] Incoming controller connection from ${conn.peer}`);
        this.connection = conn;

        conn.on('open', () => {
          console.log(`[WebRTC Host] Data connection established with controller.`);
          this.dispatch('controller:connected', { controllerId: conn.peer });
          // Ack to controller
          conn.send({ event: 'room:joined', data: { sessionId } });
        });

        conn.on('data', (payload: unknown) => {
          const msg = payload as NetworkMessage;
          if (msg && typeof msg === 'object' && msg.event) {
            this.dispatch(msg.event, msg.data);
          }
        });

        conn.on('close', () => {
          console.log(`[WebRTC Host] Controller disconnected.`);
          this.connection = null;
          this.dispatch('controller:disconnected');
        });

        conn.on('error', (err) => {
          console.warn(`[WebRTC Host] Connection error:`, err);
          this.dispatch('controller:disconnected');
        });
      });

      this.peer.on('error', (err: PeerErrorWithCode) => {
        console.warn(`[WebRTC Host] Peer error:`, err);
        if (err.type === 'unavailable-id') {
          // If ID collision, retry with new random ID
          setTimeout(() => this.createRoom(), 250);
        } else {
          this.dispatch('room:error', { message: err.message || 'Host connection error' });
        }
      });
    } catch (err) {
      console.error('[WebRTC Host] Failed to initialize peer:', err);
    }

    return sessionId;
  }

  /**
   * Mobile controller joins a game room session
   */
  public joinRoom(sessionId: string): void {
    this.destroy();
    this.role = 'controller';
    this.currentSessionId = sessionId.toUpperCase().trim();

    const targetPeerId = formatRoomPeerId(this.currentSessionId);

    // Timeout fallback if connection stalls
    this.joinTimeoutId = setTimeout(() => {
      if (!this.connected) {
        this.dispatch('room:error', {
          message: `Connection timed out. Check that the room code "${this.currentSessionId}" is still active on your screen.`,
        });
      }
    }, 10000);

    try {
      this.peer = new Peer({
        config: { iceServers: STUN_ICE_SERVERS },
        debug: 1,
      });

      this.peer.on('open', (id) => {
        console.log(`[WebRTC Controller] Peer opened (${id}), connecting to host: ${targetPeerId}`);

        // Connect to host with low-latency unordered channel for high-frequency motion
        const conn = this.peer!.connect(targetPeerId, {
          reliable: false,
        });

        this.connection = conn;

        conn.on('open', () => {
          if (this.joinTimeoutId) {
            clearTimeout(this.joinTimeoutId);
            this.joinTimeoutId = null;
          }
          this.connected = true;
          console.log(`[WebRTC Controller] Connected to host ${targetPeerId}!`);
          this.dispatch('connect');
          this.dispatch('room:joined', { sessionId: this.currentSessionId });
        });

        conn.on('data', (payload: unknown) => {
          const msg = payload as NetworkMessage;
          if (msg && typeof msg === 'object' && msg.event) {
            this.dispatch(msg.event, msg.data);
          }
        });

        conn.on('close', () => {
          console.log(`[WebRTC Controller] Host connection closed.`);
          this.dispatch('host:disconnected');
          this.connection = null;
        });

        conn.on('error', (err) => {
          console.warn(`[WebRTC Controller] Data connection error:`, err);
          this.dispatch('room:error', { message: 'Connection to host failed.' });
        });
      });

      this.peer.on('error', (err: PeerErrorWithCode) => {
        console.warn(`[WebRTC Controller] Peer error:`, err);
        if (this.joinTimeoutId) {
          clearTimeout(this.joinTimeoutId);
          this.joinTimeoutId = null;
        }
        if (err.type === 'peer-unavailable') {
          this.dispatch('room:error', {
            message: `Room "${this.currentSessionId}" not found. Please check the code on your screen.`,
          });
        } else {
          this.dispatch('room:error', {
            message: err.message || 'Unable to reach game room.',
          });
        }
      });
    } catch (err) {
      console.error('[WebRTC Controller] Failed to initialize peer:', err);
    }
  }

  /**
   * Unified message emitter compatible with previous Socket.io event protocol
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public emit(event: string, data?: any): void {
    // Handle local commands
    if (event === 'room:create') {
      this.createRoom();
      return;
    }

    if (event === 'room:join') {
      const sessionId = data?.sessionId || this.currentSessionId;
      if (sessionId) {
        this.joinRoom(sessionId);
      }
      return;
    }

    // Map outgoing events to match what the receiving end expects
    let remoteEvent = event;
    if (event === 'motion:aim') remoteEvent = 'aim:update';
    if (event === 'controller:trigger') remoteEvent = 'trigger:fired';
    if (event === 'controller:calibrated') remoteEvent = 'controller:calibrated';
    if (event === 'game:command') remoteEvent = 'game:sync';

    if (this.connection && this.connection.open) {
      this.connection.send({
        event: remoteEvent,
        data,
      });
    }
  }

  public getSessionId(): string {
    return this.currentSessionId;
  }

  public getRole(): NetworkRole {
    return this.role;
  }

  public destroy(): void {
    if (this.joinTimeoutId) {
      clearTimeout(this.joinTimeoutId);
      this.joinTimeoutId = null;
    }

    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // Ignored
      }
      this.connection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignored
      }
      this.peer = null;
    }

    this.connected = false;
    this.role = 'idle';
  }
}

// Global client singleton
let globalClient: WebRTCNetworkClient | null = null;

export function getNetworkClient(): WebRTCNetworkClient {
  if (typeof window === 'undefined') {
    return new WebRTCNetworkClient();
  }
  if (!globalClient) {
    globalClient = new WebRTCNetworkClient();
  }
  return globalClient;
}

export function resetNetworkClient(): void {
  if (globalClient) {
    globalClient.destroy();
    globalClient = null;
  }
}
