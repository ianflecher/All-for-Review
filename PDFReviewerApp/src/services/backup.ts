import { Platform } from 'react-native';
import { allKeys, readRaw, writeRaw } from '../utils/storage';

/**
 * Export and restore, so a lost or wiped phone does not mean starting over.
 *
 * The app deliberately has no account and no server, which means the device is
 * the only copy. A backup file is the honest way to close that gap: it is
 * written by the user, kept by the user, and never leaves the phone unless
 * they send it somewhere themselves.
 */

const BACKUP_APP = 'idf-reviewer';
const BACKUP_VERSION = 1;

/** Keys the app owns. Anything else in storage is left alone. */
const OWNED_PREFIXES = [
  'uploadedFiles',
  'plannerAssignments',
  'walletTransactions',
  'classSchedule',
  'studentProfile',
  'analysis_',
  'learningPath_',
  'flashcardProgress_',
  'quizHistory_',
];

const isOwned = (key: string) => OWNED_PREFIXES.some((prefix) => key.startsWith(prefix));

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

export async function collectBackup(): Promise<BackupFile> {
  const keys = (await allKeys()).filter(isOwned);
  const data: Record<string, string> = {};

  for (const key of keys) {
    const value = await readRaw(key);
    if (value !== null) data[key] = value;
  }

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Writes the backup to a file and opens the system share sheet. */
export async function exportBackup(): Promise<{ entries: number }> {
  const backup = await collectBackup();
  const json = JSON.stringify(backup, null, 2);
  const entries = Object.keys(backup.data).length;
  const fileName = `idf-reviewer-backup-${backup.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // Browsers have no share sheet worth using; a download is the equivalent.
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return { entries };
  }

  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');

  const target = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(target, json);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(target, {
    mimeType: 'application/json',
    dialogTitle: 'Save your IDF Reviewer backup',
  });

  return { entries };
}

function parseBackup(raw: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not a valid backup — it could not be read as JSON.');
  }

  const candidate = parsed as Partial<BackupFile>;
  if (!candidate || candidate.app !== BACKUP_APP) {
    throw new Error('That file was not made by this app.');
  }
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
    throw new Error('That backup came from a newer version of the app. Update first, then restore.');
  }
  if (!candidate.data || typeof candidate.data !== 'object') {
    throw new Error('That backup has no data in it.');
  }

  return candidate as BackupFile;
}

/**
 * Restores a backup file's contents, replacing anything already stored under
 * the same keys. Entries outside the app's own keys are ignored, so a doctored
 * file cannot write somewhere unexpected.
 */
export async function restoreBackup(raw: string): Promise<{ restored: number; skipped: number }> {
  const backup = parseBackup(raw);

  let restored = 0;
  let skipped = 0;

  for (const [key, value] of Object.entries(backup.data)) {
    if (!isOwned(key) || typeof value !== 'string') {
      skipped += 1;
      continue;
    }
    await writeRaw(key, value);
    restored += 1;
  }

  return { restored, skipped };
}

/** Reads a picked backup file as text, per platform. */
export async function readBackupFile(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read that file.');
    return response.text();
  }
  const FileSystem = await import('expo-file-system/legacy');
  return FileSystem.readAsStringAsync(uri);
}
