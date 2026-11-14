import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui';
import { contacts } from '@/lib/demo';
import { relativeTime } from '@/lib/format';
import { useStore } from '@/state/store';
import { colors, type } from '@/theme';

export default function ChatsScreen() {
  const { threads } = useStore();
  const sorted = [...threads].sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0));
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[type.title, { marginBottom: 14 }]}>Chats</Text>
        {sorted.map((t) => {
          const c = contacts.find((x) => x.id === t.contactId);
          const last = t.messages.at(-1);
          if (!c) return null;
          return (
            <Pressable key={t.id} onPress={() => router.push(`/chat/${t.id}`)} style={styles.row}>
              <Avatar name={c.name} color={c.color} size={50} online={c.online} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[type.body, { fontWeight: '700', flex: 1 }]}>{c.name}</Text>
                  <Text style={type.small}>{last ? relativeTime(last.at) : ''}</Text>
                </View>
                <Text numberOfLines={1} style={[type.small, { fontSize: 14, marginTop: 3 }]}>
                  {last?.mine ? 'You: ' : ''}
                  {last?.text}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
