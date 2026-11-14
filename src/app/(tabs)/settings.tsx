import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { ICE_SERVERS } from '@/lib/session';
import { SIGNALING_URL } from '@/rtc/signaling';
import { useStore } from '@/state/store';
import { colors, radius, type } from '@/theme';

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{label}</Text>
        <Text style={type.small}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor={colors.white} />
    </View>
    );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useStore();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[type.title, { marginBottom: 14 }]}>Settings</Text>
        <Card>
          <Text style={type.label}>Display name</Text>
          <TextInput
            value={settings.name}
            onChangeText={(name) => updateSettings({ name })}
            style={styles.input}
            maxLength={40}
          />
        </Card>
        <Card style={{ marginTop: 14, paddingVertical: 4 }}>
          <Toggle label="Join muted" hint="Mic is off when you enter a call" value={settings.startMuted} onChange={(v) => updateSettings({ startMuted: v })} />
          <Toggle label="Join with camera off" hint="Turn video on when you are ready" value={settings.startCameraOff} onChange={(v) => updateSettings({ startCameraOff: v })} />
          <Toggle label="Data saver" hint="Caps video at 500 kbps (SDP bandwidth limit)" value={settings.dataSaver} onChange={(v) => updateSettings({ dataSaver: v })} />
        </Card>
        <Card style={{ marginTop: 14, gap: 6 }}>
          <Text style={type.h2}>Connection</Text>
          <Text style={type.small}>Signaling: {SIGNALING_URL ? SIGNALING_URL : 'built-in (echo peer and browser tabs)'}</Text>
          <Text style={type.small}>STUN: {ICE_SERVERS[0].urls.join(', ')}</Text>
          <Text style={type.small}>Media: WebRTC, DTLS-SRTP encrypted, peer to peer</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  input: { marginTop: 8, height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
