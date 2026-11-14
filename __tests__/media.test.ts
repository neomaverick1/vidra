import { addMessage, parseWire } from '@/lib/chat';
import { callDuration, initials, relativeTime } from '@/lib/format';
import { readStats, scoreQuality } from '@/lib/quality';
import { capBitrate, preferCodec } from '@/lib/sdp';

const SDP = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'c=IN IP4 0.0.0.0',
  'a=rtpmap:111 opus/48000/2',
  'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99',
  'c=IN IP4 0.0.0.0',
  'a=rtpmap:96 VP8/90000',
  'a=rtpmap:97 rtx/90000',
  'a=fmtp:97 apt=96',
  'a=rtpmap:98 H264/90000',
  'a=rtpmap:99 rtx/90000',
  'a=fmtp:99 apt=98',
  '',
].join('\r\n');

describe('sdp', () => {
  it('prefers a codec and keeps its rtx next to it', () => {
    expect(preferCodec(SDP, 'H264')).toContain('m=video 9 UDP/TLS/RTP/SAVPF 98 99 96 97');
  });
  it('leaves sdp alone for unknown codecs', () => expect(preferCodec(SDP, 'AV1')).toBe(SDP));
  it('caps video bitrate only in the video section', () => {
    const out = capBitrate(SDP, 500);
    expect(out.match(/b=AS:500/g)).toHaveLength(1);
    expect(out.indexOf('b=AS:500')).toBeGreaterThan(out.indexOf('m=video'));
    expect(capBitrate(out, 300).match(/b=AS:/g)).toHaveLength(1);
  });
});

describe('quality', () => {
  it('scores links', () => {
    expect(scoreQuality({})).toEqual({ bars: 0, label: 'Connecting' });
    expect(scoreQuality({ rttMs: 40, packetLossPct: 0, jitterMs: 5, bitrateKbps: 1500 }).label).toBe('Excellent');
    expect(scoreQuality({ rttMs: 200, packetLossPct: 2 }).bars).toBe(2);
    expect(scoreQuality({ rttMs: 400, packetLossPct: 8, jitterMs: 50 }).bars).toBe(1);
  });
  it('reads an RTCStatsReport and computes bitrate', () => {
    const rows = [
      { id: 'a', type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.05 },
      { id: 'b', type: 'inbound-rtp', kind: 'video', packetsLost: 2, packetsReceived: 98, bytesReceived: 250_000, jitter: 0.012 },
    ];
    const report = { forEach: (cb: (v: any) => void) => rows.forEach(cb) };
    const { stats, bytes } = readStats(report, { bytes: 0, at: 0 }, 2000);
    expect(stats.rttMs).toBeCloseTo(50);
    expect(stats.packetLossPct).toBeCloseTo(2);
    expect(stats.jitterMs).toBeCloseTo(12);
    expect(stats.bitrateKbps).toBeCloseTo(1000);
    expect(bytes).toBe(250_000);
  });
});

describe('chat over the data channel', () => {
  it('accepts valid messages and rejects junk', () => {
    expect(parseWire(JSON.stringify({ kind: 'chat', id: '1', name: 'A', text: 'hi', at: 1 }))?.kind).toBe('chat');
    expect(parseWire(JSON.stringify({ kind: 'typing', name: 'A' }))?.kind).toBe('typing');
    expect(parseWire('{bad json')).toBeNull();
    expect(parseWire(JSON.stringify({ kind: 'chat', id: '1', name: 'A', text: '   ', at: 1 }))).toBeNull();
    expect(parseWire(42)).toBeNull();
  });
  it('dedupes and orders', () => {
    const a = { id: 'a', from: 'x', name: 'X', text: '1', at: 2 };
    const b = { id: 'b', from: 'x', name: 'X', text: '2', at: 1 };
    const list = addMessage(addMessage(addMessage([], a), b), a);
    expect(list.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('format', () => {
  it('durations', () => {
    expect(callDuration(5)).toBe('0:05');
    expect(callDuration(754)).toBe('12:34');
    expect(callDuration(3725)).toBe('1:02:05');
  });
  it('relative time and initials', () => {
    const now = 1_000_000_000;
    expect(relativeTime(now - 30_000, now)).toBe('just now');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(relativeTime(now - 26 * 3600_000, now)).toBe('yesterday');
    expect(initials('Maya Chen')).toBe('MC');
    expect(initials('alex')).toBe('A');
  });
});
