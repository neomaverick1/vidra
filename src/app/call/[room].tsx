import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundButton, SignalBars } from '@/components/ui';
import type { ChatMessage } from '@/lib/chat';
import { callDuration, initials } from '@/lib/format';
import { type LinkStats, scoreQuality } from '@/lib/quality';
import { inviteLink, isEchoRoom } from '@/lib/room';
import { type CallState, CallSession } from '@/lib/session';
import { startEchoPeer } from '@/rtc/echo';
import { media } from '@/rtc/media';
import { signalingFor } from '@/rtc/signaling';
import { canFlipCamera, createPeer, flipCamera, getLocalStream, setTrackEnabled, stopStream, type Stream, VideoView } from '@/rtc/webrtc';
import { useStore } from '@/state/store';
import { colors, radius } from '@/theme';

const myId = `p-${Math.random().toString(36).slice(2, 10)}`;

export default function CallScreen() {
  const params = useLocalSearchParams<{ room: string; mic?: string; cam?: string }>();
  const room = String(params.room);
  const { settings, logCall } = useStore();
  const [local, setLocal] = useState<Stream | null>(media.stream);
  const [remote, setRemote] = useState<Stream | null>(null);
  const [peer, setPeer] = useState<string | null>(null);
  const [state, setState] = useState<CallState>('idle');
  const [mic, setMic] = useState(params.mic !== '0');
  const [cam, setCam] = useState(params.cam !== '0');
  const [stats, setStats] = useState<LinkStats>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [typing, setTyping] = useState('');
  const [draft, setDraft] = useState('');
  const [seconds, setSeconds] = useState(0);
  const session = useRef<CallSession | null>(null);
  const connectedAt = useRef<number | null>(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    let stopEcho: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      let stream = media.stream;
      if (!stream) {
        try {
          stream = await getLocalStream({ video: true, front: true });
          media.stream = stream;
        } catch {
          stream = null;
        }
      }
      if (cancelled) return;
      setTrackEnabled(stream, 'audio', params.mic !== '0');
      setTrackEnabled(stream, 'video', params.cam !== '0');
      setLocal(stream);
      const s = new CallSession({
        me: myId,
        name: settings.name,
        room,
        signaling: signalingFor(room),
        createPeer,
        localStream: stream,
        maxKbps: settings.dataSaver ? 500 : undefined,
        events: {
          onState: (st) => {
            setState(st);
            if (st === 'connected' && !connectedAt.current) connectedAt.current = Date.now();
          },
          onRemoteStream: (r) => setRemote(r as Stream | null),
          onPeer: setPeer,
          onStats: setStats,
          onTyping: (n) => {
            setTyping(n);
            setTimeout(() => setTyping(''), 2500);
          },
          onChat: (list) => {
            setMessages(list);
            setTyping('');
            if (!chatOpenRef.current) setUnread((u) => u + 1);
          },
        },
      });
      session.current = s;
      await s.start();
      if (isEchoRoom(room)) stopEcho = await startEchoPeer(room, stream);
    })();
    const tick = setInterval(() => {
      if (connectedAt.current) setSeconds((Date.now() - connectedAt.current) / 1000);
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(tick);
      session.current?.hangUp();
      stopEcho?.();
      stopStream(media.stream);
      media.stream = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => setTrackEnabled(local, 'audio', mic), [local, mic]);
  useEffect(() => setTrackEnabled(local, 'video', cam), [local, cam]);

  const hangUp = () => {
    logCall({
      contactId: isEchoRoom(room) ? 'maya' : 'jordan',
      direction: 'out',
      at: Date.now(),
      seconds: Math.round(seconds),
      video: cam,
    });
    router.replace('/');
  };

  const send = () => {
    if (session.current?.sendChat(draft)) setDraft('');
  };

  const q = scoreQuality(stats);
  const status =
    state === 'connected' ? callDuration(seconds) : state === 'reconnecting' ? 'Reconnecting…' : peer ? 'Connecting…' : 'Waiting for others';

  return (
    <View style={styles.root}>
      {remote ? (
        <VideoView stream={remote} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.waiting}>
          <View style={styles.pulse}>
            <Ionicons name="people" size={44} color={colors.white} />
          </View>
          <Text style={styles.waitTitle}>{peer ? `Connecting to ${peer}…` : 'Waiting for others to join'}</Text>
          {!isEchoRoom(room) && (
            <>
              <Text style={styles.waitBody}>Share this code: {room}</Text>
              <Pressable onPress={() => Share.share({ message: `Join my Vidra call: ${inviteLink(room)}` })} style={styles.invite}>
                <Ionicons name="share-outline" size={18} color={colors.bg} />
                <Text style={{ fontWeight: '700', color: colors.bg }}>Invite</Text>
              </Pressable>
              {Platform.OS === 'web' && <Text style={styles.waitHint}>Tip: open this page in a second tab to call yourself.</Text>}
            </>
          )}
        </View>
      )}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.topPill}>
            <Ionicons name="lock-closed" size={13} color={colors.accent} />
            <Text style={styles.topText}>{peer ?? 'Vidra'}</Text>
            <Text style={[styles.topText, { color: 'rgba(255,255,255,0.7)', fontWeight: '600' }]}>{status}</Text>
            {state === 'connected' && <SignalBars bars={q.bars} />}
          </View>
        </View>

        <View style={styles.pip}>
          {local && cam ? (
            <VideoView stream={local} mirror style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.pipOff]}>
              <Text style={{ color: colors.white, fontWeight: '800', fontSize: 22 }}>{initials(settings.name)}</Text>
            </View>
          )}
          {!mic && (
            <View style={styles.muted}>
              <Ionicons name="mic-off" size={12} color={colors.white} />
            </View>
          )}
        </View>

        {chatOpen && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chat}>
            <View style={styles.chatHead}>
              <Text style={{ color: colors.white, fontWeight: '800', fontSize: 16, flex: 1 }}>In-call chat</Text>
              <Pressable onPress={() => setChatOpen(false)} accessibilityLabel="Close chat">
                <Ionicons name="close" size={22} color={colors.white} />
              </Pressable>
            </View>
            <FlatList
              data={[...messages].reverse()}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ gap: 8, padding: 12 }}
              ListHeaderComponent={typing ? <Text style={{ color: colors.muted, fontSize: 12 }}>{typing} is typing…</Text> : undefined}
              renderItem={({ item }) => {
                const mine = item.from === myId;
                return (
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    {!mine && <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>{item.name}</Text>}
                    <Text style={{ color: colors.white, fontSize: 15 }}>{item.text}</Text>
                  </View>
                );
              }}
            />
            <View style={styles.composer}>
              <TextInput
                testID="callChatInput"
                value={draft}
                onChangeText={(t) => {
                  setDraft(t);
                  session.current?.sendTyping();
                }}
                onSubmitEditing={send}
                placeholder={state === 'connected' ? 'Message everyone' : 'Chat opens when connected'}
                placeholderTextColor="#8A90A6"
                style={styles.input}
              />
              <Pressable onPress={send} style={styles.send} accessibilityLabel="Send">
                <Ionicons name="send" size={17} color={colors.white} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        <View style={styles.controls}>
          <RoundButton testID="mic" icon={mic ? 'mic' : 'mic-off'} tone={mic ? 'dark' : 'light'} onPress={() => setMic(!mic)} />
          <RoundButton testID="cam" icon={cam ? 'videocam' : 'videocam-off'} tone={cam ? 'dark' : 'light'} onPress={() => setCam(!cam)} />
          {canFlipCamera && <RoundButton icon="camera-reverse" onPress={() => flipCamera(local)} />}
          <View>
            <RoundButton
              testID="chat"
              icon="chatbubble-ellipses"
              tone={chatOpen ? 'primary' : 'dark'}
              onPress={() => {
                setChatOpen(!chatOpen);
                setUnread(0);
              }}
            />
            {unread > 0 && !chatOpen && (
              <View style={styles.badge}>
                <Text style={{ color: colors.white, fontSize: 11, fontWeight: '800' }}>{unread}</Text>
              </View>
            )}
          </View>
          <RoundButton testID="hangup" icon="call" tone="danger" rotate="135deg" label={undefined} onPress={hangUp} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060A' },
  waiting: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  pulse: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 10, borderColor: 'rgba(124,92,255,0.3)' },
  waitTitle: { color: colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  waitBody: { color: colors.muted, fontSize: 15 },
  waitHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  invite: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, marginTop: 6 },
  topBar: { alignItems: 'center', paddingTop: 8 },
  topPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(10,11,18,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  topText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  pip: { position: 'absolute', right: 16, top: 70, width: 110, height: 160, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: colors.surface2 },
  pipOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  muted: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.danger, borderRadius: 10, padding: 4 },
  controls: { position: 'absolute', bottom: 28, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  badge: { position: 'absolute', right: -2, top: -2, backgroundColor: colors.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  chat: { position: 'absolute', left: 12, right: 12, bottom: 110, maxHeight: 360, backgroundColor: 'rgba(14,15,22,0.92)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  chatHead: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface2 },
  composer: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface2, color: colors.white, paddingHorizontal: 14 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
