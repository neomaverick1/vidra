/**
 * Signaling: how two peers find each other and swap SDP offers/answers and ICE candidates
 * before the direct (peer-to-peer) WebRTC connection exists.
 */
export type SignalMessage =
  | { type: 'hello'; from: string; name: string }
  | { type: 'welcome'; from: string; to: string; name: string }
  | { type: 'description'; from: string; to: string; description: { type: string; sdp?: string } }
  | { type: 'candidate'; from: string; to: string; candidate: unknown }
  | { type: 'bye'; from: string };

export interface Signaling {
  readonly kind: string;
  join(room: string, onMessage: (m: SignalMessage) => void): Promise<void>;
  send(m: SignalMessage): void;
  leave(): void;
}

export function isSignalMessage(v: unknown): v is SignalMessage {
  if (!v || typeof v !== 'object') return false;
  const m = v as { type?: unknown; from?: unknown };
  return typeof m.from === 'string' && ['hello', 'welcome', 'description', 'candidate', 'bye'].includes(m.type as string);
}

/** True when [m] is meant for [me] (broadcasts have no `to`) and isn't my own echo. */
export function isForMe(m: SignalMessage, me: string) {
  if (m.from === me) return false;
  return !('to' in m) || m.to === me;
}

/** In-memory bus: lets the built-in echo peer talk to you on the same device (all platforms). */
export class LocalBus {
  private rooms = new Map<string, Set<(m: SignalMessage) => void>>();
  channel(): Signaling {
    let room = '';
    let handler: ((m: SignalMessage) => void) | null = null;
    const bus = this;
    return {
      kind: 'local',
      async join(r, onMessage) {
        room = r;
        handler = onMessage;
        if (!bus.rooms.has(r)) bus.rooms.set(r, new Set());
        bus.rooms.get(r)!.add(onMessage);
      },
      send(m) {
        const subs = bus.rooms.get(room);
        if (!subs) return;
        for (const s of subs) if (s !== handler) setTimeout(() => s(m), 0);
      },
      leave() {
        if (handler) bus.rooms.get(room)?.delete(handler);
        handler = null;
      },
    };
  }
}

export const localBus = new LocalBus();

/** Web only: browser tabs on the same machine signal through BroadcastChannel (no server needed). */
export class BroadcastSignaling implements Signaling {
  readonly kind = 'tabs';
  private ch: BroadcastChannel | null = null;
  async join(room: string, onMessage: (m: SignalMessage) => void) {
    this.ch = new BroadcastChannel(`vidra:${room}`);
    this.ch.onmessage = (e) => isSignalMessage(e.data) && onMessage(e.data);
  }
  send(m: SignalMessage) {
    this.ch?.postMessage(m);
  }
  leave() {
    this.ch?.close();
    this.ch = null;
  }
}

/**
 * Any device, any network: a tiny WebSocket relay (see server/relay.js).
 * Set EXPO_PUBLIC_SIGNALING_URL=wss://your-host to turn it on.
 */
export class WebSocketSignaling implements Signaling {
  readonly kind = 'websocket';
  private ws: WebSocket | null = null;
  private queue: string[] = [];
  constructor(private url: string) {}
  join(room: string, onMessage: (m: SignalMessage) => void) {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${this.url}?room=${encodeURIComponent(room)}`);
      this.ws = ws;
      ws.onopen = () => {
        this.queue.forEach((q) => ws.send(q));
        this.queue = [];
        resolve();
      };
      ws.onerror = () => reject(new Error('Signaling server unreachable'));
      ws.onmessage = (e) => {
        try {
          const v = JSON.parse(String(e.data));
          if (isSignalMessage(v)) onMessage(v);
        } catch {
          // ignore
        }
      };
    });
  }
  send(m: SignalMessage) {
    const s = JSON.stringify(m);
    if (this.ws?.readyState === 1) this.ws.send(s);
    else this.queue.push(s);
  }
  leave() {
    this.ws?.close();
    this.ws = null;
  }
}
