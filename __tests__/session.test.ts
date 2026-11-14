import { CallSession, type DataChannelLike, type PeerConnectionLike } from '@/lib/session';
import { LocalBus } from '@/lib/signaling';

/**
 * A fake peer connection pair: offers/answers and data-channel messages are wired directly,
 * so the real CallSession negotiation logic (perfect negotiation, candidates, chat) is exercised.
 */
type Listener = (e: any) => void;
class FakeChannel implements DataChannelLike {
  readyState = 'connecting';
  other: FakeChannel | null = null;
  private l: Record<string, Listener[]> = {};
  addEventListener(t: string, cb: Listener) {
    (this.l[t] ??= []).push(cb);
  }
  emit(t: string, e: any) {
    (this.l[t] ?? []).forEach((cb) => cb(e));
  }
  send(data: string) {
    setTimeout(() => this.other?.emit('message', { data }), 0);
  }
  close() {
    this.readyState = 'closed';
  }
}

const registry: FakePeer[] = [];
class FakePeer implements PeerConnectionLike {
  signalingState = 'stable';
  connectionState = 'new';
  localDescription: { type: string; sdp?: string } | null = null;
  remoteDescription: { type: string; sdp?: string } | null = null;
  tracks: unknown[] = [];
  channel: FakeChannel | null = null;
  private l: Record<string, Listener[]> = {};
  private negotiationQueued = false;
  constructor() {
    registry.push(this);
  }
  addEventListener(t: string, cb: Listener) {
    (this.l[t] ??= []).push(cb);
  }
  emit(t: string, e: any = {}) {
    (this.l[t] ?? []).forEach((cb) => cb(e));
  }
  private queueNegotiation() {
    if (this.negotiationQueued) return;
    this.negotiationQueued = true;
    setTimeout(() => {
      this.negotiationQueued = false;
      this.emit('negotiationneeded');
    }, 0);
  }
  addTrack(t: unknown) {
    this.tracks.push(t);
    this.queueNegotiation();
  }
  createDataChannel() {
    this.channel = new FakeChannel();
    this.queueNegotiation();
    return this.channel;
  }
  async createOffer() {
    return { type: 'offer', sdp: `offer-${registry.indexOf(this)}` };
  }
  async createAnswer() {
    return { type: 'answer', sdp: `answer-${registry.indexOf(this)}` };
  }
  async setLocalDescription(d: { type: string; sdp?: string }) {
    this.localDescription = d;
    this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable';
    if (d.type === 'answer') this.connect();
  }
  async setRemoteDescription(d: { type: string; sdp?: string }) {
    this.remoteDescription = d;
    this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable';
    if (d.type === 'answer') this.connect();
  }
  async addIceCandidate() {}
  async getStats() {
    return { forEach: () => undefined };
  }
  private connect() {
    this.connectionState = 'connected';
    this.emit('connectionstatechange');
    const other = registry.find((p) => p !== this && p.remoteDescription && p.localDescription && !p.closed);
    if (this.channel && other && !other.channel) {
      const theirs = new FakeChannel();
      theirs.other = this.channel;
      this.channel.other = theirs;
      this.channel.readyState = 'open';
      theirs.readyState = 'open';
      other.channel = theirs;
      other.emit('datachannel', { channel: theirs });
    }
    this.emit('track', { streams: ['remote-stream'] });
  }
  closed = false;
  close() {
    this.closed = true;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 20));

describe('CallSession', () => {
  beforeEach(() => {
    registry.length = 0;
    jest.useRealTimers();
  });

  it('two peers find each other, negotiate and chat over the data channel', async () => {
    const bus = new LocalBus();
    const events = { a: [] as string[], b: [] as string[] };
    const chats: Record<string, string[]> = { a: [], b: [] };
    const make = (id: string, name: string, key: 'a' | 'b') =>
      new CallSession({
        me: id,
        name,
        room: 'kqz-mwpt-ahd',
        signaling: bus.channel(),
        createPeer: () => new FakePeer(),
        localStream: { getTracks: () => ['audio', 'video'] },
        events: {
          onState: (s) => events[key].push(s),
          onChat: (list) => (chats[key] = list.map((m) => `${m.name}: ${m.text}`)),
        },
      });
    const alice = make('p-a', 'Alice', 'a');
    const bob = make('p-b', 'Bob', 'b');
    await alice.start();
    await bob.start();
    await flush();
    await flush();

    expect(alice.polite).toBe(false);
    expect(bob.polite).toBe(true);
    expect(events.a).toContain('connected');
    expect(events.b).toContain('connected');

    expect(alice.sendChat('hello bob')).toBe(true);
    await flush();
    expect(chats.b).toEqual(['Alice: hello bob']);
    expect(bob.sendChat('hi alice')).toBe(true);
    await flush();
    expect(chats.a).toEqual(['Alice: hello bob', 'Bob: hi alice']);

    alice.hangUp();
    await flush();
    expect(events.a.at(-1)).toBe('ended');
    expect(events.b.at(-1)).toBe('waiting');
  });

  it('refuses to send chat before the channel is open or when empty', async () => {
    const bus = new LocalBus();
    const s = new CallSession({
      me: 'p-x',
      name: 'X',
      room: 'r',
      signaling: bus.channel(),
      createPeer: () => new FakePeer(),
      localStream: null,
      events: {},
    });
    await s.start();
    expect(s.sendChat('hi')).toBe(false);
    expect(s.sendChat('   ')).toBe(false);
  });
});
