export type LinkStats = {
  rttMs?: number;
  packetLossPct?: number;
  jitterMs?: number;
  bitrateKbps?: number;
};

export type Quality = { bars: 0 | 1 | 2 | 3 | 4; label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Connecting' };

/** Turns WebRTC stats into the 4-bar signal indicator (thresholds follow common VoIP MOS guidance). */
export function scoreQuality(s: LinkStats): Quality {
  if (s.rttMs === undefined && s.packetLossPct === undefined) return { bars: 0, label: 'Connecting' };
  let score = 4;
  const rtt = s.rttMs ?? 0;
  const loss = s.packetLossPct ?? 0;
  const jitter = s.jitterMs ?? 0;
  if (rtt > 150) score--;
  if (rtt > 300) score--;
  if (loss > 1) score--;
  if (loss > 5) score--;
  if (jitter > 30) score--;
  if (s.bitrateKbps !== undefined && s.bitrateKbps < 150) score--;
  const bars = Math.max(1, Math.min(4, score)) as Quality['bars'];
  const label = bars === 4 ? 'Excellent' : bars === 3 ? 'Good' : bars === 2 ? 'Fair' : 'Poor';
  return { bars, label };
}

type StatEntry = Record<string, unknown> & { type: string; id: string };

/** Extracts the numbers we need from an RTCStatsReport (web and react-native-webrtc both iterate). */
export function readStats(
  report: { forEach: (cb: (v: StatEntry) => void) => void },
  previous?: { bytes: number; at: number },
  now = Date.now(),
): { stats: LinkStats; bytes: number } {
  let rtt: number | undefined;
  let lost = 0;
  let received = 0;
  let jitter: number | undefined;
  let bytes = 0;
  report.forEach((r) => {
    if (r.type === 'candidate-pair' && (r.state === 'succeeded' || r.nominated) && typeof r.currentRoundTripTime === 'number') {
      rtt = r.currentRoundTripTime * 1000;
    }
    if (r.type === 'inbound-rtp') {
      lost += Number(r.packetsLost ?? 0);
      received += Number(r.packetsReceived ?? 0);
      bytes += Number(r.bytesReceived ?? 0);
      if (r.kind === 'video' && typeof r.jitter === 'number') jitter = r.jitter * 1000;
    }
  });
  const total = lost + received;
  const bitrateKbps =
    previous && now > previous.at ? Math.max(0, ((bytes - previous.bytes) * 8) / (now - previous.at)) : undefined;
  return {
    stats: {
      rttMs: rtt,
      packetLossPct: total > 0 ? (lost / total) * 100 : undefined,
      jitterMs: jitter,
      bitrateKbps,
    },
    bytes,
  };
}
