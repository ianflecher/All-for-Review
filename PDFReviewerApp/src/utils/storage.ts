import { Platform } from 'react-native';

/**
 * Small JSON layer over the platform's local store.
 *
 * Native goes to AsyncStorage (SQLite under the hood on Android), web to
 * localStorage. Everything stays on the device; nothing is uploaded.
 *
 * Reads and writes never throw: a corrupt or unreadable entry falls back to
 * the caller's default rather than taking a screen down with it.
 */

async function nativeStore() {
  return (await import('@react-native-async-storage/async-storage')).default;
}

const onWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = onWeb() ? window.localStorage.getItem(key) : await (await nativeStore()).getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : (parsed as T);
  } catch (e) {
    console.warn(`Could not read "${key}" from storage:`, e);
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (onWeb()) {
      window.localStorage.setItem(key, raw);
    } else {
      await (await nativeStore()).setItem(key, raw);
    }
  } catch (e) {
    console.warn(`Could not save "${key}" to storage:`, e);
  }
}

/** Storage keys, kept together so it is obvious what the app persists. */
export const STORAGE_KEYS = {
  files: 'uploadedFiles',
  assignments: 'plannerAssignments',
  transactions: 'walletTransactions',
  schedule: 'classSchedule',
} as const;

export async function removeJson(key: string): Promise<void> {
  try {
    if (onWeb()) {
      window.localStorage.removeItem(key);
    } else {
      await (await nativeStore()).removeItem(key);
    }
  } catch (e) {
    console.warn(`Could not remove "${key}" from storage:`, e);
  }
}
