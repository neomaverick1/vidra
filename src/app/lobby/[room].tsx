import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pill, PrimaryButton, RoundButton } from '@/components/ui';
import { initials } from '@/lib/format';
import { inviteLink, isEchoRoom } from '@/lib/room';
import { media } from '@/rtc/media';
import { signalingLabel } from '@/rtc/signaling';
import { getLocalStream, setTrackEnabled, stopStream, type Stream, VideoView } from '@/rtc/webrtc';
import { useStore } from '@/state/store';
import { colors, radius, type } from '@/theme';

export default function LobbyScreen() {
  const { room } = useLocalSearchParams<{ room: string }>();
  const { settings } = useStore();
  const [stream, setStream] = useState<Stream | null>(null);
  const [mic, setMic] = useState(!settings.startMuted);
  const [cam, setCam] = useState(!settings.startCameraOff);
  const [error, setError] = useState('');
  const echo = isEchoRoom(String(room));

  useEffect(() => {
    let alive = true;
    getLocalStream({ video: true, front: true })
      .then((s) => {
        if (!alive) return stopStream(s);
        media.stream = s;
        setStream(s);
      })
      .catch(() => setError('Camera or microphone is blocked. Allow access to join with video.'));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => setTrackEnabled(stream, 'audio', mic), [stream, mic]);
  useEffect(() => setTrackEnabled(stream, 'video', cam), [stream, cam]);

  const close = () => {
    stopStream(media.stream);
    media.stream = null;
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Pressable onPress={close} accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[type.h2, { flex: 1, textAlign: 'center' }]}>{echo ? 'Test call' : 'Ready to join?'}</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.preview}>
          {stream && cam ? (
            <VideoView stream={stream} mirror style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.camOff}>
              <View style={styles.bigAvatar}>
                <Text style={{ color: colors.white, fontSize: 40, fontWeight: '800' }}>{initials(settings.name)}</Text>
              </View>
              <Text style={[type.small, { marginTop: 12 }]}>{error || (cam ? 'Starting camera…' : 'Camera is off')}</Text>
            </View>
          )}
          <View style={styles.previewBar}>
            <RoundButton testID="lobbyMic" icon={mic ? 'mic' : 'mic-off'} tone={mic ? 'dark' : 'danger'} size={50} onPress={() => setMic(!mic)} />
            <RoundButton testID="lobbyCam" icon={cam ? 'videocam' : 'videocam-off'} tone={cam ? 'dark' : 'danger'} size={50} onPress={() => setCam(!cam)} />
          </View>
        </View>

        <View style={{ gap: 10, width: '100%' }}>
          <Text style={type.label}>Meeting code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{echo ? 'Echo test peer' : room}</Text>
            {!echo && (
              <Pressable onPress={() => Share.share({ message: `Join my Vidra call: ${inviteLink(String(room))}` })} style={styles.share} accessibilityLabel="Share invite">
                <Ionicons name="share-outline" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>
          <Pill text={signalingLabel(String(room))} icon="git-network-outline" color={colors.muted} bg={colors.surface2} />
          <PrimaryButton
            testID="join"
            title="Join now"
            icon="videocam"
            tone="accent"
            onPress={() => router.replace(`/call/${room}?mic=${mic ? 1 : 0}&cam=${cam ? 1 : 0}`)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  body: { flex: 1, padding: 20, gap: 22, alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  preview: { width: '100%', flex: 1, maxHeight: 520, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  camOff: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewBar: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingLeft: 16, height: 54 },
  code: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: 1.5 },
  share: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
});
