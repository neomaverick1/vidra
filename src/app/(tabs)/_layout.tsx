import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { colors } from '@/theme';

function icon(on: IconName, off: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? on : off} color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#6B7189',
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Calls', tabBarIcon: icon('videocam', 'videocam-outline') }} />
      <Tabs.Screen name="contacts" options={{ title: 'Contacts', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
