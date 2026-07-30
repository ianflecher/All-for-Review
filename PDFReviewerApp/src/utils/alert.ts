import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * react-native-web's Alert.alert() is a no-op (it does nothing and returns
 * immediately), so on web every error/confirmation in this app would fail
 * completely silently. This wraps Alert.alert and falls back to
 * window.alert/window.confirm on web so the user actually sees something.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;

    if (buttons && buttons.length > 1) {
      const cancelButton = buttons.find((b) => b.style === 'cancel');
      const confirmButton = buttons.find((b) => b !== cancelButton) || buttons[0];
      if (window.confirm(fullMessage)) {
        confirmButton.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
      return;
    }

    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  Alert.alert(title, message, buttons);
}
