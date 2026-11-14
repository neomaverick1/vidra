import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Pill } from '@/components/ui';
import { contacts } from '@/lib/demo';
import { newRoomCode } from '@/lib/room';
import { colors, radius, type } from '@/theme';

function Row({ c }: { c: (typeof contacts)[number] }) {
  const call = (bot?: boolean) => router.push(bot ? '/lobby/echo-test' : `/lobby/${newRoomCode()}`);
  return (
    <View style={styles.row}>
      <Avatar name={c.name} color={c.color} size={46} online={c.online} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '700' }]}>{c.name}</Text>
        <Text style={type.small}>{c.role}</Text>
      </View>
      <Pressable onPress={() => router.push(`/chat/t-${c.id}`)} style={styles.icon} accessibilityLabel={`Message ${c.name}`}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => call(c.bot)} style={[styles.icon, { backgroundColor: colors.accentSoft }]} accessibilityLabel={`Video call ${c.name}`}>
        <Ionicons name="videocam" size={20} color={colors.accent} />
      </Pressable>
    </View>
  );
}

export default function ContactsScreen() {
  const [q, setQ] = useState('');
  const list = contacts.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const online = list.filter((c) => c.online);
  const offline = list.filter((c) => !c.online);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[type.title, { marginBottom: 14 }]}>Contacts</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search people" placeholderTextColor="#5C6178" style={{ flex: 1, color: colors.text, fontSize: 16 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 6 }}>
          <Text style={type.h2}>Online</Text>
          <Pill text={`${online.length}`} />
        </View>
        {online.map((c) => (
          <Row key={c.id} c={c} />
        ))}
        <Text style={[type.h2, { marginTop: 20, marginBottom: 6 }]}>Offline</Text>
        {offline.map((c) => (
          <Row key={c.id} c={c} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  search: { flexDirection: 'row', gap: 10, alignItems: 'center', height: 48, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
});
