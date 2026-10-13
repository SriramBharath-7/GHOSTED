import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const android = Platform.OS === 'android';

function run(effect: () => Promise<void>) {
  if (!enabled || Platform.OS === 'web') return;
  effect().catch(() => undefined);
}

/** Named feedback moments. Android uses the system haptic engine, not the vibrator. */
export const haptics = {
  tap: () =>
    run(() =>
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
        : Haptics.selectionAsync(),
    ),
  complete: () =>
    run(() =>
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    ),
  undo: () =>
    run(() =>
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    ),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  error: () =>
    run(() =>
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    ),
};
