import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, PrimaryButton } from '@/components/ui';
import { contacts } from '@/lib/demo';
import { callDuration, relativeTime } from '@/lib/format';
import { newRoomCode, normalizeRoomCode } from '@/lib/room';
import { useStore } from '@/state/store';
import { colors, radius, type } from '@/theme';

export default function CallsScreen() {
  const { calls, settings } = useStore();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const join = () => {
    const room = normalizeRoomCode(code);
    if (!room) return setErr('Enter a 10-letter code like kqz-mwpt-ahd');
    setErr('');
    router.push(`/lobby/${room}`);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={type.label}>Good to see you, {settings.name.split(' ')[0]}</Text>
        <Text style={[type.title, { marginBottom: 18 }]}>Vidra</Text>

        <View style={styles.hero}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pill text="End-to-end encrypted" icon="lock-closed" color={colors.white} bg="rgba(255,255,255,0.18)" />
          </View>
          <Text style={styles.heroTitle}>HD video calls,{'\n'}peer to peer.</Text>
          <Text style={styles.heroBody}>Start a meeting and share the code. Video and chat go straight between devices over WebRTC.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton testID="newMeeting" title="New call" icon="add-circle" tone="accent" onPress={() => router.push(`/lobby/${newRoomCode()}`)} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Test call" icon="pulse" tone="ghost" onPress={() => router.push('/lobby/echo-test')} />
            </View>
          </View>
        </View>

        <Card style={{ marginTop: 14 }}>
          <Text style={type.h2}>Join with a code</Text>
          <View style={styles.joinRow}>
            <TextInput
              testID="joinCode"
              value={code}
              onChangeText={setCode}
              placeholder="kqz-mwpt-ahd"
              placeholderTextColor="#5C6178"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={join}
              style={styles.input}
            />
            <Pressable onPress={join} style={styles.joinBtn} accessibilityLabel="Join">
              <Ionicons name="arrow-forward" size={22} color={colors.white} />
            </Pressable>
          </View>
          {err ? <Text style={{ color: colors.danger, marginTop: 6 }}>{err}</Text> : null}
        </Card>

        <Text style={[type.h2, { marginTop: 24, marginBottom: 10 }]}>Recent</Text>
        {calls.map((c) => {
          const who = contacts.find((x) => x.id === c.contactId)!;
          const missed = c.direction === 'missed';
          return (
            <Pressable key={c.id} onPress={() => router.push(who.bot ? '/lobby/echo-test' : `/lobby/${newRoomCode()}`)} style={styles.row}>
              <Avatar name={who.name} color={who.color} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '700', color: missed ? colors.danger : colors.text }]}>{who.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons
                    name={c.direction === 'out' ? 'arrow-up' : c.direction === 'in' ? 'arrow-down' : 'close'}
                    size={13}
                    color={missed ? colors.danger : colors.muted}
                  />
                  <Text style={type.small}>
                    {missed ? 'Missed' : c.direction === 'out' ? 'Outgoing' : 'Incoming'} · {relativeTime(c.at)}
                    {c.seconds ? ` · ${callDuration(c.seconds)}` : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name={c.video ? 'videocam-outline' : 'call-outline'} size={22} color={colors.accent} />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: radius.lg, padding: 20, gap: 14, backgroundColor: '#3D2AA8', overflow: 'hidden' },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, lineHeight: 33 },
  heroBody: { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 21 },
  joinRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 17,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
