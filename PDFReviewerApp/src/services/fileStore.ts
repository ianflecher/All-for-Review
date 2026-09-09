import { Platform } from 'react-native';

/**
 * Keeps picked documents somewhere Android will not delete.
 *
 * The picker hands back a copy in the cache directory, which the system is
 * free to clear whenever storage runs low — so a document added but not yet
 * opened could simply stop working. Everything is copied into the app's
 * documents directory instead, which only goes when the app does.
 */

const SUBDIRECTORY = 'documents/';

async function fileSystem() {
  return import('expo-file-system/legacy');
}

async function documentsDir(): Promise<string> {
  const FileSystem = await fileSystem();
  return `${FileSystem.documentDirectory}${SUBDIRECTORY}`;
}

/** Strips anything that could confuse a path, keeping the extension readable. */
function safeName(fileName: string): string {
  return fileName.replace(/[^\w.\- ]+/g, '_').slice(-120);
}

/**
 * Copies a freshly picked file into permanent storage and returns its new URI.
 * Falls back to the original URI if the copy fails, so a storage problem
 * downgrades durability rather than losing the document outright.
 */
export async function persistPickedFile(uri: string, fileName: string): Promise<string> {
  if (Platform.OS === 'web') return uri; // browsers hand back blob: URIs

  try {
    const FileSystem = await fileSystem();
    const directory = await documentsDir();
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);

    const target = `${directory}${Date.now()}_${safeName(fileName)}`;
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch (e) {
    console.warn('Could not copy the document into permanent storage:', e);
    return uri;
  }
}

/** Removes a stored copy. Never throws — deleting is always best-effort. */
export async function deleteStoredFile(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!uri.startsWith('file://')) return;

  try {
    const FileSystem = await fileSystem();
    const directory = await documentsDir();
    // Only ever delete inside our own folder, never a path the picker gave us.
    if (!uri.startsWith(directory)) return;
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    console.warn('Could not delete the stored document:', e);
  }
}
