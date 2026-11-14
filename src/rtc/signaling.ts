import { Platform } from 'react-native';

import { isEchoRoom } from '@/lib/room';
import { BroadcastSignaling, localBus, type Signaling, WebSocketSignaling } from '@/lib/signaling';

export const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_URL ?? '';

/** Picks how peers find each other for this room. */
export function signalingFor(room: string): Signaling {
  if (isEchoRoom(room)) return localBus.channel();
  if (SIGNALING_URL) return new WebSocketSignaling(SIGNALING_URL);
  if (Platform.OS === 'web' && typeof BroadcastChannel !== 'undefined') return new BroadcastSignaling();
  return localBus.channel();
}

export function signalingLabel(room: string) {
  if (isEchoRoom(room)) return 'Echo test (on this device)';
  if (SIGNALING_URL) return 'Relay server';
  if (Platform.OS === 'web') return 'Browser tabs on this computer';
  return 'This device only (set a relay to call other phones)';
}
