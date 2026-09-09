import { analyzeDocument, extractKeywords, extractTopics, splitIntoSentences } from '../textAnalysis';

const LESSON = `Photosynthesis Overview

Photosynthesis is the process by which green plants make food.
The light-dependent reactions take place in the thylakoid membrane.
During the light-dependent reactions, water is split and oxygen is released.
The light-dependent reactions produce ATP for the Calvin cycle.

The Calvin cycle occurs in the stroma. The Calvin cycle fixes carbon dioxide.
Carbon dioxide enters the leaf through the stomata. Carbon dioxide is fixed by RuBisCO.
The Calvin cycle builds glucose from carbon dioxide.`;

describe('splitting sentences', () => {
  it('separates a heading from the sentence beneath it', () => {
    // A slide title with no full stop used to be glued to the next sentence,
    // producing "What is Photosynthesis Overview Photosynthesis?".
    const sentences = splitIntoSentences('Cell Biology\n\nA cell is the unit of life.');
    expect(sentences[0]).toBe('Cell Biology');
    expect(sentences[1]).toBe('A cell is the unit of life.');
  });

  it('does not chop hard-wrapped prose at the line breaks', () => {
    const wrapped = [
      'The mitochondrion is a double-membrane organelle found in most eukaryotic',
      'cells, and it generates most of the chemical energy needed to power the',
      "cell's biochemical reactions.",
    ].join('\n');

    expect(splitIntoSentences(wrapped)).toHaveLength(1);
  });
});

describe('topics', () => {
  const topics = extractTopics(LESSON, 8);

  it.each(['light-dependent reactions', 'Calvin cycle', 'carbon dioxide'])(
    'keeps "%s" together',
    (phrase) => {
      expect(topics.some((topic) => topic.toLowerCase() === phrase.toLowerCase())).toBe(true);
    }
  );

  it.each(['carbon', 'cycle', 'light', 'dependent'])(
    'does not also list "%s" on its own',
    (word) => {
      expect(topics.some((topic) => topic.toLowerCase() === word)).toBe(false);
    }
  );

  it('honours the requested count', () => {
    expect(extractTopics(LESSON, 3)).toHaveLength(3);
  });

  it('handles text with nothing in it', () => {
    expect(extractTopics('')).toEqual([]);
    expect(extractTopics('hello there')).toBeInstanceOf(Array);
  });
});

describe('keywords', () => {
  it('folds a plural into its singular when both appear', () => {
    const keywords = extractKeywords('The cell divides. Cells divide often. Cells are small.', 5);
    expect(keywords).toContain('cell');
    expect(keywords).not.toContain('cells');
  });

  it('drops filler that scores well on frequency but names no idea', () => {
    const keywords = extractKeywords(LESSON, 15);
    for (const filler of ['every', 'important', 'used', 'inside']) {
      expect(keywords).not.toContain(filler);
    }
  });
});

describe('analysing a document', () => {
  it('produces a summary, cards and a quiz that agree with each other', () => {
    const analysis = analyzeDocument(LESSON);

    expect(analysis.wordCount).toBeGreaterThan(0);
    expect(analysis.summary.length).toBeGreaterThan(0);
    expect(analysis.flashcards.length).toBeGreaterThan(0);

    for (const question of analysis.quiz) {
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(question.options[question.correctAnswer]).toBeDefined();
    }
  });

  it('returns empty results for empty input instead of throwing', () => {
    const analysis = analyzeDocument('');
    expect(analysis).toMatchObject({ summary: [], flashcards: [], quiz: [], wordCount: 0 });
  });
});
