import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui';
import { autoReply, contacts } from '@/lib/demo';
import { newRoomCode } from '@/lib/room';
import { useStore } from '@/state/store';
import { colors, radius, type } from '@/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { threads, sendText } = useStore();
  const [text, setText] = useState('');
  const thread = threads.find((t) => t.id === id);
  const contact = contacts.find((c) => c.id === (thread?.contactId ?? String(id).replace(/^t-/, '')));
  if (!contact) return null;
  const messages = [...(thread?.messages ?? [])].reverse();

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendText(String(id), t);
    setText('');
    if (contact.bot) setTimeout(() => sendText(String(id), autoReply(t), false), 1100);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Avatar name={contact.name} color={contact.color} size={38} online={contact.online} />
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { fontWeight: '700' }]}>{contact.name}</Text>
          <Text style={type.small}>{contact.online ? 'Online' : 'Offline'}</Text>
        </View>
        <Pressable onPress={() => router.push(contact.bot ? '/lobby/echo-test' : `/lobby/${newRoomCode()}`)} style={styles.call} accessibilityLabel="Video call">
          <Ionicons name="videocam" size={20} color={colors.accent} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              <Text style={{ color: item.mine ? colors.white : colors.text, fontSize: 15 }}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            placeholder="Message"
            placeholderTextColor="#5C6178"
            style={styles.input}
          />
          <Pressable onPress={send} style={styles.send} accessibilityLabel="Send">
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  call: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderBottomLeftRadius: 4 },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 16, fontSize: 15 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
