import { createElement, useEffect, useRef } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import type { PeerConnectionLike } from '@/lib/session';

export type Stream = MediaStream;

export function createPeer(config: RTCConfiguration | { iceServers: unknown[] }): PeerConnectionLike {
  return new RTCPeerConnection(config as RTCConfiguration) as unknown as PeerConnectionLike;
}

export async function getLocalStream(opts: { video: boolean; front: boolean }): Promise<Stream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: opts.video ? { facingMode: opts.front ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  });
}

export function stopStream(s: Stream | null | undefined) {
  s?.getTracks().forEach((t) => t.stop());
}

export function setTrackEnabled(s: Stream | null, kind: 'audio' | 'video', enabled: boolean) {
  s?.getTracks().forEach((t) => {
    if (t.kind === kind) t.enabled = enabled;
  });
}

export async function flipCamera() {
  // Laptops have one camera; phones in a browser can re-open with facingMode (not needed for the demo).
}

export const canFlipCamera = false;

/** In the browser the echo peer streams an animated avatar drawn on a canvas. */
export async function makeEchoStream(): Promise<Stream | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;
  let t = 0;
  const draw = () => {
    t += 1 / 30;
    const g = ctx.createLinearGradient(0, 0, 720, 1280);
    g.addColorStop(0, '#2B1E6B');
    g.addColorStop(1, '#0E1530');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 720, 1280);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(124,92,255,${0.35 - i * 0.1})`;
      ctx.lineWidth = 6;
      ctx.arc(360, 560, 190 + i * 55 + Math.sin(t * 2 + i) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = '#7C5CFF';
    ctx.arc(360, 560, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 130px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MC', 360, 566);
    // Voice bars
    for (let i = 0; i < 9; i++) {
      const h = 20 + Math.abs(Math.sin(t * 6 + i * 0.7)) * 70;
      ctx.fillStyle = '#2EE6C5';
      ctx.fillRect(360 - 4 * 34 + i * 34 - 8, 880 - h / 2, 16, h);
    }
    requestAnimationFrame(draw);
  };
  draw();
  return (canvas as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(30);
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
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <View style={[styles.wrap, style]}>
      {createElement('video', {
        ref,
        autoPlay: true,
        playsInline: true,
        muted: !!mirror,
        style: {
          width: '100%',
          height: '100%',
          objectFit: cover ? 'cover' : 'contain',
          transform: mirror ? 'scaleX(-1)' : undefined,
          backgroundColor: '#000',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { overflow: 'hidden' } });
