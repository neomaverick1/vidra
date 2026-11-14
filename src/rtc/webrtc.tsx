import { mediaDevices, MediaStream, RTCPeerConnection, RTCView } from 'react-native-webrtc';
import type { StyleProp, ViewStyle } from 'react-native';

import type { PeerConnectionLike } from '@/lib/session';

export type Stream = MediaStream;

export function createPeer(config: RTCConfiguration | { iceServers: unknown[] }): PeerConnectionLike {
  return new RTCPeerConnection(config as never) as unknown as PeerConnectionLike;
}

export async function getLocalStream(opts: { video: boolean; front: boolean }): Promise<Stream> {
  return (await mediaDevices.getUserMedia({
    audio: true,
    video: opts.video ? { facingMode: opts.front ? 'user' : 'environment', width: 1280, height: 720, frameRate: 30 } : false,
  })) as Stream;
}

export function stopStream(s: Stream | null | undefined) {
  s?.getTracks().forEach((t) => t.stop());
}

export function setTrackEnabled(s: Stream | null, kind: 'audio' | 'video', enabled: boolean) {
  s?.getTracks().forEach((t) => {
    if (t.kind === kind) t.enabled = enabled;
  });
}

export async function flipCamera(s: Stream | null) {
  const track = s?.getVideoTracks()[0] as unknown as { _switchCamera?: () => void } | undefined;
  track?._switchCamera?.();
}

export const canFlipCamera = true;

/** On phones the echo peer sends your own camera back to you (a loopback through a second peer connection). */
export async function makeEchoStream(local: Stream | null): Promise<Stream | null> {
  if (!local) return null;
  const s = new MediaStream(undefined);
  local.getVideoTracks().forEach((t) => s.addTrack(t));
  return s;
}

export function VideoView({
  stream,
  mirror,
  style,
  cover = true,
}: {
  stream: Stream | null;
  mirror?: boolean;
  style?: StyleProp<ViewStyle>;
  cover?: boolean;
}) {
  if (!stream) return null;
  return <RTCView streamURL={stream.toURL()} mirror={mirror} objectFit={cover ? 'cover' : 'contain'} style={style} zOrder={mirror ? 1 : 0} />;
}
