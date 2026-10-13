import { Exo2_400Regular } from '@expo-google-fonts/exo-2/400Regular';
import { Exo2_500Medium } from '@expo-google-fonts/exo-2/500Medium';
import { Exo2_600SemiBold } from '@expo-google-fonts/exo-2/600SemiBold';
import { Exo2_700Bold } from '@expo-google-fonts/exo-2/700Bold';
import { Exo2_800ExtraBold } from '@expo-google-fonts/exo-2/800ExtraBold';
import { Orbitron_500Medium } from '@expo-google-fonts/orbitron/500Medium';
import { Orbitron_600SemiBold } from '@expo-google-fonts/orbitron/600SemiBold';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron/700Bold';
import { Orbitron_900Black } from '@expo-google-fonts/orbitron/900Black';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootSequence } from '@/components/fx/BootSequence';
import { FxHost } from '@/components/fx/Overlays';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ToastHost } from '@/components/ui/Toast';
import { colors, space } from '@/config/theme';
import { useGame } from '@/state/game';

void SplashScreen.preventAutoHideAsync();

/** Survives re-mounts: the boot ident plays once per process, not on every resume. */
let bootPlayed = false;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Exo2_400Regular,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    Exo2_800ExtraBold,
    Orbitron_500Medium,
    Orbitron_600SemiBold,
    Orbitron_700Bold,
    Orbitron_900Black,
  });
  const ready = useGame((s) => s.ready);
  const [error, setError] = useState<string | null>(null);
  const [showBoot, setShowBoot] = useState(!bootPlayed);

  const start = useCallback(() => {
    useGame
      .getState()
      .boot()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(start, [start]);

  const retry = () => {
    setError(null);
    start();
  };

  useEffect(() => {
    if (fontsLoaded && (ready || error)) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready, error]);

  // New day while the app is open or resumed: roll Daily over. A resume also
  // re-checks notification permission (it can change in system settings).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || !useGame.getState().ready) return;
      void useGame.getState().checkDay();
      void useGame.getState().refreshReminders();
    });
    let timer: ReturnType<typeof setTimeout>;
    const armMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      timer = setTimeout(() => {
        void useGame.getState().checkDay();
        armMidnight();
      }, midnight.getTime() - now.getTime());
    };
    armMidnight();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);

  const finishBoot = useCallback(() => {
    bootPlayed = true;
    setShowBoot(false);
  }, []);

  if (!fontsLoaded) return null;
  if (error) {
    return (
      <View style={styles.error}>
        <Text variant="title">Couldn’t open your data</Text>
        <Text variant="caption" align="center">
          {error}
        </Text>
        <Button label="Try again" onPress={retry} />
      </View>
    );
  }
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit-editor" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="reward-editor" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="mission-editor" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="vault" options={{ animation: 'fade' }} />
        </Stack>
        <FxHost />
        <ToastHost />
        {showBoot ? <BootSequence onDone={finishBoot} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  error: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xxl,
  },
});
