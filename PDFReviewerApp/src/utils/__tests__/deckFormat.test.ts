import { Flashcard } from '../../types';
import {
  DECK_VERSION,
  buildDeck,
  parseSharedDeck,
  safeFileName,
  toAnkiCsv,
} from '../deckFormat';

const card = (question: string, answer: string): Flashcard => ({
  id: question,
  question,
  answer,
  createdAt: new Date(),
});

const analysis = {
  summary: ['A summary line.'],
  keywords: ['cell'],
  flashcards: [card('What is a cell?', 'The unit of life')],
  quiz: [],
  wordCount: 42,
};

describe('Anki CSV', () => {
  it('writes one row per card, front then back', () => {
    const csv = toAnkiCsv([card('Q1', 'A1'), card('Q2', 'A2')]);
    expect(csv).toBe('"Q1","A1"\n"Q2","A2"');
  });

  it('escapes the quotes a fill-in-the-blank question always contains', () => {
    // Cloze questions are literally: Fill in the blank: "The _____ is..."
    const csv = toAnkiCsv([card('Fill in the blank: "The _____ divides."', 'cell')]);
    expect(csv).toBe('"Fill in the blank: ""The _____ divides.""","cell"');
  });

  it('survives commas and newlines inside a card', () => {
    const csv = toAnkiCsv([card('One, two, three', 'line one\nline two')]);
    expect(csv).toBe('"One, two, three","line one\nline two"');
  });
});

describe('file names', () => {
  it.each([
    ['Cell Biology.pdf', 'Cell-Biology'],
    ['Araling Panlipunan — Modyul 3.docx', 'Araling-Panlipunan-Modyul-3'],
    ['', 'deck'],
  ])('turns %p into %p', (input, expected) => {
    expect(safeFileName(input)).toBe(expected);
  });

  it.each(['../../etc/passwd', 'a/b/c.txt', '..\\..\\win.ini', 'no*such?name'])(
    'strips anything path-like out of %p',
    (input) => {
      // The name is handed to the filesystem and then to other apps, so what
      // matters is that no separator or traversal survives — not the exact
      // string that comes back.
      const name = safeFileName(input);
      expect(name).not.toMatch(/[/\\]/);
      expect(name).not.toContain('..');
      expect(name.length).toBeGreaterThan(0);
    }
  );
});

describe('deck round trip', () => {
  it('reads back what it wrote', () => {
    const raw = JSON.stringify(buildDeck('Cell Biology', 'Some text', analysis));
    const deck = parseSharedDeck(raw);

    expect(deck.name).toBe('Cell Biology');
    expect(deck.version).toBe(DECK_VERSION);
    expect(deck.analysis.flashcards).toHaveLength(1);
  });

  it.each([
    ['not JSON at all', 'hello', 'could not be read'],
    ['JSON from something else', '{"app":"other"}', 'not a deck from this app'],
    ['a deck with no cards', '{"app":"idf-reviewer-deck","version":1,"analysis":{}}', 'no cards'],
  ])('refuses %s', (_name, raw, message) => {
    expect(() => parseSharedDeck(raw)).toThrow(new RegExp(message, 'i'));
  });

  it('refuses a deck from a newer app rather than half-reading it', () => {
    const raw = JSON.stringify({ ...buildDeck('x', '', analysis), version: DECK_VERSION + 1 });
    expect(() => parseSharedDeck(raw)).toThrow(/newer version/i);
  });
});
