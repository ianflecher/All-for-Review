import { Platform } from 'react-native';
import { DocumentAnalysis, Flashcard, FileItem } from '../types';
import { loadJson, saveJson, STORAGE_KEYS } from '../utils/storage';
import { buildDeck, parseSharedDeck, safeFileName, toAnkiCsv } from '../utils/deckFormat';

/**
 * Sending a deck to a classmate, and taking one into Anki.
 *
 * Sharing is how Quizlet actually won, and it is how students here already
 * work — a file dropped into a group chat. This is that, without a server: the
 * deck is written to a file and handed to the system share sheet, so it
 * travels over whatever messaging app is already installed.
 */

async function writeAndShare(fileName: string, contents: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');

  const target = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(target, contents);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(target, { mimeType, dialogTitle: 'Send this deck' });
}

export async function shareDeck(
  name: string,
  text: string,
  analysis: DocumentAnalysis
): Promise<void> {
  await writeAndShare(
    `${safeFileName(name)}-deck.json`,
    JSON.stringify(buildDeck(name, text, analysis)),
    'application/json'
  );
}

export async function exportDeckForAnki(name: string, flashcards: Flashcard[]): Promise<number> {
  if (flashcards.length === 0) {
    throw new Error('There are no cards to export yet.');
  }

  await writeAndShare(`${safeFileName(name)}-anki.csv`, toAnkiCsv(flashcards), 'text/csv');
  return flashcards.length;
}

/**
 * Files a received deck as a document, so it shows up beside everything else
 * and every screen works on it without knowing where it came from.
 */
export async function importDeck(raw: string): Promise<{ name: string; cards: number }> {
  const deck = parseSharedDeck(raw);
  const id = `deck-${Date.now()}`;

  const item: FileItem = {
    id,
    name: deck.name || 'Shared deck',
    // Nothing to re-read: the analysis travelled with it.
    uri: '',
    uploadedAt: new Date().toLocaleString(),
    type: 'text',
    kind: 'text',
  };

  const files = await loadJson<FileItem[]>(STORAGE_KEYS.files, []);
  await saveJson(STORAGE_KEYS.files, [item, ...files]);
  await saveJson(`analysis_${id}`, { text: deck.text ?? '', analysis: deck.analysis });

  return { name: item.name, cards: deck.analysis.flashcards.length };
}

export async function readDeckFile(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read that file.');
    return response.text();
  }
  const FileSystem = await import('expo-file-system/legacy');
  return FileSystem.readAsStringAsync(uri);
}
