import { addMessage, type ChatMessage, messageId, parseWire } from './chat';
import { type LinkStats, readStats } from './quality';
import { capBitrate } from './sdp';
import { isForMe, type SignalMessage, type Signaling } from './signaling';

/** The subset of the WebRTC API we use; satisfied by browsers and react-native-webrtc. */
export type PeerConnectionLike = {
  signalingState: string;
  connectionState?: string;
  iceConnectionState?: string;
  localDescription: { type: string; sdp?: string } | null;
  remoteDescription: { type: string; sdp?: string } | null;
  addTrack(track: unknown, stream: unknown): unknown;
  createOffer(): Promise<{ type: string; sdp?: string }>;
  createAnswer(): Promise<{ type: string; sdp?: string }>;
  setLocalDescription(d: { type: string; sdp?: string }): Promise<void>;
  setRemoteDescription(d: { type: string; sdp?: string }): Promise<void>;
  addIceCandidate(c: unknown): Promise<void>;
  createDataChannel(label: string): DataChannelLike;
  getStats(): Promise<{ forEach: (cb: (v: any) => void) => void }>;
  addEventListener(type: string, cb: (e: any) => void): void;
  close(): void;
};

export type DataChannelLike = {
  readyState: string;
  send(data: string): void;
  close(): void;
  addEventListener(type: string, cb: (e: any) => void): void;
};

export type CallState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'reconnecting' | 'ended';

export type SessionEvents = {
  onState?: (s: CallState) => void;
  onRemoteStream?: (stream: unknown | null) => void;
  onPeer?: (name: string | null) => void;
  onChat?: (messages: ChatMessage[]) => void;
  onTyping?: (name: string) => void;
  onStats?: (s: LinkStats) => void;
};

/** Free public STUN servers; add a TURN server here for strict corporate networks. */
export const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

/**
 * One 1:1 call. Implements the WebRTC "perfect negotiation" pattern so both sides can
 * (re)negotiate at any time without glare: the peer with the larger id is "polite".
 */
export class CallSession {
  private pc: PeerConnectionLike | null = null;
  private dc: DataChannelLike | null = null;
  private peerId: string | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  private pendingCandidates: unknown[] = [];
  private messages: ChatMessage[] = [];
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private lastBytes: { bytes: number; at: number } | undefined;
  state: CallState = 'idle';

  constructor(
    private readonly opts: {
      me: string;
      name: string;
      room: string;
      signaling: Signaling;
      createPeer: (config: { iceServers: typeof ICE_SERVERS }) => PeerConnectionLike;
      localStream: { getTracks(): unknown[] } | null;
      maxKbps?: number;
      events: SessionEvents;
    },
  ) {}

  get polite() {
    return this.peerId !== null && this.opts.me > this.peerId;
  }

  async start() {
    this.setState('waiting');
    await this.opts.signaling.join(this.opts.room, (m) => void this.onSignal(m));
    this.opts.signaling.send({ type: 'hello', from: this.opts.me, name: this.opts.name });
  }

  private setState(s: CallState) {
    if (this.state === s) return;
    this.state = s;
    this.opts.events.onState?.(s);
  }

  private send(m: SignalMessage) {
    // RTCSessionDescription / RTCIceCandidate are host objects; send plain JSON so any transport can carry them.
    this.opts.signaling.send(JSON.parse(JSON.stringify(m)));
  }

  private ensurePeer(peerId: string, name: string) {
    if (this.pc && this.peerId === peerId) return;
    if (this.pc) this.teardownPeer();
    this.peerId = peerId;
    this.opts.events.onPeer?.(name);
    this.setState('connecting');
    const pc = this.opts.createPeer({ iceServers: ICE_SERVERS });
    this.pc = pc;

    pc.addEventListener('icecandidate', (e) => {
      if (e.candidate) this.send({ type: 'candidate', from: this.opts.me, to: peerId, candidate: e.candidate });
    });
    pc.addEventListener('track', (e) => {
      if (e.streams?.[0]) this.opts.events.onRemoteStream?.(e.streams[0]);
    });
    const onConn = () => {
      const s = pc.connectionState ?? pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') this.setState('connected');
      else if (s === 'disconnected') this.setState('reconnecting');
      else if (s === 'failed') this.setState('reconnecting');
    };
    pc.addEventListener('connectionstatechange', onConn);
    pc.addEventListener('iceconnectionstatechange', onConn);
    pc.addEventListener('negotiationneeded', () => void this.negotiate());
    pc.addEventListener('datachannel', (e) => this.attachChannel(e.channel));

    const stream = this.opts.localStream;
    if (stream) for (const t of stream.getTracks()) pc.addTrack(t, stream);
    if (!this.polite) this.attachChannel(pc.createDataChannel('chat'));
    this.startStats();
  }

  private async negotiate() {
    const pc = this.pc;
    if (!pc || !this.peerId) return;
    try {
      this.makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(this.tune(offer));
      this.send({ type: 'description', from: this.opts.me, to: this.peerId, description: pc.localDescription! });
    } finally {
      this.makingOffer = false;
    }
  }

  private tune(d: { type: string; sdp?: string }) {
    return this.opts.maxKbps && d.sdp ? { type: d.type, sdp: capBitrate(d.sdp, this.opts.maxKbps) } : d;
  }

  async onSignal(m: SignalMessage) {
    if (!isForMe(m, this.opts.me)) return;
    switch (m.type) {
      case 'hello':
        // A new peer arrived: introduce ourselves and get ready to connect.
        this.send({ type: 'welcome', from: this.opts.me, to: m.from, name: this.opts.name });
        this.ensurePeer(m.from, m.name);
        return;
      case 'welcome':
        this.ensurePeer(m.from, m.name);
        return;
      case 'bye':
        if (m.from === this.peerId) {
          this.teardownPeer();
          this.opts.events.onPeer?.(null);
          this.opts.events.onRemoteStream?.(null);
          this.setState('waiting');
        }
        return;
      case 'description': {
        const pc = this.pc;
        if (!pc || m.from !== this.peerId) return;
        const d = m.description;
        const collision = d.type === 'offer' && (this.makingOffer || pc.signalingState !== 'stable');
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;
        await pc.setRemoteDescription(d);
        for (const c of this.pendingCandidates.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
        if (d.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(this.tune(answer));
          this.send({ type: 'description', from: this.opts.me, to: m.from, description: pc.localDescription! });
        }
        return;
      }
      case 'candidate': {
        const pc = this.pc;
        if (!pc || m.from !== this.peerId) return;
        if (!pc.remoteDescription) {
          this.pendingCandidates.push(m.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(m.candidate);
        } catch {
          // Candidates for an offer we ignored are expected to fail.
        }
      }
    }
  }

  private attachChannel(ch: DataChannelLike) {
    this.dc = ch;
    ch.addEventListener('message', (e) => {
      const w = parseWire(e.data);
      if (!w) return;
      if (w.kind === 'typing') this.opts.events.onTyping?.(w.name);
      else {
        this.messages = addMessage(this.messages, { id: w.id, from: this.peerId ?? 'peer', name: w.name, text: w.text, at: w.at });
        this.opts.events.onChat?.(this.messages);
      }
    });
  }

  /** Sends a chat message straight to the other person over the encrypted data channel. */
  sendChat(text: string): boolean {
    const clean = text.trim();
    if (!clean || this.dc?.readyState !== 'open') return false;
    const msg = { id: messageId(), from: this.opts.me, name: this.opts.name, text: clean, at: Date.now() };
    this.dc.send(JSON.stringify({ kind: 'chat', id: msg.id, name: msg.name, text: msg.text, at: msg.at }));
    this.messages = addMessage(this.messages, msg);
    this.opts.events.onChat?.(this.messages);
    return true;
  }

  sendTyping() {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify({ kind: 'typing', name: this.opts.name }));
  }

  private startStats() {
    this.stopStats();
    this.statsTimer = setInterval(async () => {
      if (!this.pc) return;
      try {
        const report = await this.pc.getStats();
        const { stats, bytes } = readStats(report, this.lastBytes);
        this.lastBytes = { bytes, at: Date.now() };
        this.opts.events.onStats?.(stats);
      } catch {
        // stats are best-effort
      }
    }, 2000);
  }

  private stopStats() {
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
  }

  private teardownPeer() {
    this.stopStats();
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
    this.peerId = null;
    this.pendingCandidates = [];
    this.lastBytes = undefined;
  }

  hangUp() {
    this.send({ type: 'bye', from: this.opts.me });
    this.teardownPeer();
    this.opts.signaling.leave();
    this.setState('ended');
  }
}
