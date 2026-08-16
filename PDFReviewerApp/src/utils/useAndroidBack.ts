import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Runs `onBack` when the Android hardware/gesture back button is pressed.
 *
 * The app moves between screens with plain state instead of a navigator, so
 * without this every back press falls through to the OS and closes the app —
 * even from inside a quiz. Handlers registered last are called first, so the
 * deepest mounted screen wins.
 *
 * Return `true` from `onBack` to say "I handled it"; return `false` to let the
 * press fall through (e.g. to leave the app from the landing screen).
 */
export function useAndroidBack(onBack: () => boolean, enabled: boolean = true) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, [onBack, enabled]);
}
