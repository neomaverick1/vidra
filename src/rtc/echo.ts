import { Platform } from 'react-native';

import { CallSession } from '@/lib/session';
import { localBus } from '@/lib/signaling';
import { autoReply } from '@/lib/demo';

import { createPeer, makeEchoStream, stopStream, type Stream } from './webrtc';

/**
 * Built-in test contact. It is a second, real CallSession on the same device that joins the
 * room over the in-memory bus, answers the offer and streams video back, so the whole
 * offer/answer/ICE/data-channel path runs exactly as in a call between two phones.
 */
export async function startEchoPeer(room: string, local: Stream | null) {
  const stream = await makeEchoStream(local);
  let session: CallSession | null = null;
  let seen = 0;
  session = new CallSession({
    me: 'zz-echo-peer',
    name: 'Maya Chen',
    room,
    signaling: localBus.channel(),
    createPeer,
    localStream: stream,
    events: {
      onChat: (msgs) => {
        const fresh = msgs.slice(seen).filter((m) => m.name !== 'Maya Chen');
        seen = msgs.length;
        fresh.forEach((m) =>
          setTimeout(() => {
            session?.sendTyping();
            setTimeout(() => session?.sendChat(autoReply(m.text)), 900);
          }, 400),
        );
      },
    },
  });
  await session.start();
  return () => {
    session?.hangUp();
    // On phones the echo stream shares your camera track, so only stop the canvas stream on the web.
    if (Platform.OS === 'web') stopStream(stream);
  };
}
