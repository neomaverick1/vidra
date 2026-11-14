/** Moves the payload types of [codec] to the front of the m=video line so it is negotiated first. */
export function preferCodec(sdp: string, codec: string, kind: 'video' | 'audio' = 'video'): string {
  const lines = sdp.split('\r\n');
  const mIndex = lines.findIndex((l) => l.startsWith(`m=${kind}`));
  if (mIndex < 0) return sdp;
  const pts = lines
    .filter((l) => l.startsWith('a=rtpmap:') && l.toLowerCase().includes(` ${codec.toLowerCase()}/`))
    .map((l) => l.slice('a=rtpmap:'.length).split(' ')[0]);
  if (!pts.length) return sdp;
  // Keep the retransmission (rtx) payloads that belong to the preferred codec right after it.
  const rtx = lines
    .filter((l) => l.startsWith('a=fmtp:') && pts.some((p) => l.endsWith(`apt=${p}`)))
    .map((l) => l.slice('a=fmtp:'.length).split(' ')[0]);
  const parts = lines[mIndex].split(' ');
  const header = parts.slice(0, 3);
  const payloads = parts.slice(3);
  const first = [...pts, ...rtx].filter((p) => payloads.includes(p));
  lines[mIndex] = [...header, ...first, ...payloads.filter((p) => !first.includes(p))].join(' ');
  return lines.join('\r\n');
}

/** Caps the video bitrate with a b=AS line (kbps) — useful on mobile data. */
export function capBitrate(sdp: string, kbps: number, kind: 'video' | 'audio' = 'video'): string {
  const lines = sdp.split('\r\n');
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith('m=')) inSection = line.startsWith(`m=${kind}`);
    if (inSection && line.startsWith('b=AS:')) continue;
    out.push(line);
    if (inSection && line.startsWith('c=')) out.push(`b=AS:${kbps}`);
  }
  return out.join('\r\n');
}
