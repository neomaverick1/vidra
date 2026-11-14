import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/state/store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lobby/[room]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="call/[room]" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="chat/[id]" />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
