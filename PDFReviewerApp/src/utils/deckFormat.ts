import { DocumentAnalysis, Flashcard } from '../types';

/**
 * The deck file format and the Anki CSV, kept free of file and platform code
 * so both can be tested directly. Anything that touches the disk or the share
 * sheet lives in services/deckShare.
 */

export const DECK_APP = 'idf-reviewer-deck';
export const DECK_VERSION = 1;

export interface SharedDeck {
  app: string;
  version: number;
  name: string;
  createdAt: string;
  text: string;
  analysis: DocumentAnalysis;
}

/** Filenames travel through other apps, so keep them boring. */
export function safeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim();
  return (base || 'deck').slice(0, 60).replace(/\s+/g, '-');
}

/** RFC 4180 quoting: wrap in quotes, and double any quote inside. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Anki imports a two-column CSV directly, front then back. Exporting to it
 * turns Anki into somewhere a deck can go rather than a rival — generate here,
 * review there, if that is what someone prefers.
 */
export function toAnkiCsv(flashcards: Flashcard[]): string {
  return flashcards.map((card) => `${csvCell(card.question)},${csvCell(card.answer)}`).join('\n');
}

export function buildDeck(name: string, text: string, analysis: DocumentAnalysis): SharedDeck {
  return {
    app: DECK_APP,
    version: DECK_VERSION,
    name,
    createdAt: new Date().toISOString(),
    text,
    analysis,
  };
}

/**
 * Reads a received deck, refusing anything that is not one. The messages say
 * what is wrong, because this file arrived through a chat app and the usual
 * reason for failure is that the wrong attachment got picked.
 */
export function parseSharedDeck(raw: string): SharedDeck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file could not be read as a deck.');
  }

  const deck = parsed as Partial<SharedDeck>;
  if (!deck || deck.app !== DECK_APP) {
    throw new Error('That file is not a deck from this app.');
  }
  if (typeof deck.version !== 'number' || deck.version > DECK_VERSION) {
    throw new Error('That deck was made by a newer version of the app. Update first.');
  }
  if (!deck.analysis || !Array.isArray(deck.analysis.flashcards)) {
    throw new Error('That deck has no cards in it.');
  }

  return deck as SharedDeck;
}
