import { Flashcard, QuizQuestion } from '../types';

export interface DocumentAnalysis {
  summary: string[];
  keywords: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  wordCount: number;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was',
  'one', 'our', 'out', 'his', 'has', 'had', 'this', 'that', 'with', 'from', 'they',
  'will', 'would', 'there', 'their', 'what', 'when', 'where', 'which', 'while', 'who',
  'about', 'into', 'than', 'then', 'them', 'these', 'those', 'were', 'been', 'being',
  'have', 'having', 'does', 'did', 'doing', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'only', 'own', 'same', 'she', 'him', 'its', 'itself', 'just', 'also',
  'over', 'under', 'again', 'further', 'because', 'until', 'while', 'both', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'here', 'how', 'once',
  'off', 'should', 'could', 'may', 'might', 'must', 'shall', 'per', 'via', 'within',
  'without', 'upon', 'onto', 'thus', 'hence', 'etc', 'e.g', 'i.e', 'ing', 'page',
  // Generic filler that scores well on frequency alone but names no idea, and
  // would otherwise take a slot from a real topic.
  'every', 'many', 'much', 'another', 'used', 'use', 'uses', 'using', 'make',
  'makes', 'made', 'well', 'even', 'still', 'often', 'always', 'never', 'one',
  'two', 'three', 'first', 'second', 'third', 'new', 'old', 'good', 'great',
  'small', 'large', 'part', 'parts', 'kind', 'kinds', 'type', 'types', 'way',
  'ways', 'thing', 'things', 'example', 'examples', 'called', 'known', 'important',
  'different', 'various', 'like', 'get', 'gets', 'got', 'take', 'takes', 'give',
  'gives', 'come', 'comes', 'know', 'need', 'needs', 'want', 'find', 'found',
  'show', 'shows', 'shown', 'said', 'says', 'let', 'put', 'set', 'see', 'seen',
  'keep', 'keeps', 'kept', 'help', 'helps', 'means', 'begin', 'begins', 'end',
  'ends', 'goes', 'going', 'happen', 'happens', 'occur', 'occurs',
  'inside', 'outside', 'around', 'across', 'along', 'among', 'toward', 'towards',
  'behind', 'beyond', 'near', 'next', 'back', 'front', 'able', 'according',
]);

/**
 * Folds a plural into its singular when both forms appear, so "cell" and
 * "cells" count as one idea instead of competing for two slots.
 *
 * Deliberately not a stemmer: a word is only touched when the other form is
 * genuinely present in this document, which avoids mangling terms like "gas"
 * or "process" that merely look like plurals.
 */
function mergePlurals(freq: Map<string, number>): Map<string, number> {
  const merged = new Map(freq);

  for (const word of [...merged.keys()]) {
    if (!merged.has(word)) continue;
    for (const suffix of ['s', 'es']) {
      const plural = word + suffix;
      const pluralCount = merged.get(plural);
      if (pluralCount === undefined) continue;
      merged.set(word, (merged.get(word) ?? 0) + pluralCount);
      merged.delete(plural);
    }
  }

  return merged;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Distinguishes a heading / slide title from a hard-wrapped body line.
 *
 * Both end without a full stop, so length alone can't tell them apart — a line
 * wrapped at 72 columns looks exactly like a long heading. What separates them
 * is what comes next: a heading is followed by a blank line or by the start of
 * a new sentence, whereas a wrapped line runs straight on into its own
 * continuation. Requiring both a short line and a clean break after it keeps
 * hard-wrapped paragraphs intact.
 *
 * Lines ending in ':' deliberately don't count: "Term: definition" split across
 * two lines needs to stay joined for the definition patterns to match it.
 */
function looksLikeHeading(line: string, nextLine: string | undefined): boolean {
  if (line.length > 60) return false;
  if (/[.!?:;,]$/.test(line)) return false;
  if (line.split(' ').length > 10) return false;

  // End of input, or a paragraph break, or the next line opens something new.
  if (nextLine === undefined || nextLine.length === 0) return true;
  return /^[A-Z0-9]/.test(nextLine);
}

export function splitIntoSentences(text: string): string[] {
  const out: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join(' ').trim();
    buffer = [];
    if (!joined) return;
    const matches = joined.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [joined];
    for (const match of matches) {
      const sentence = match.trim();
      if (sentence.length > 0) out.push(sentence);
    }
  };

  // Headings are pulled out line by line; everything else is joined back up
  // before sentence splitting, so hard-wrapped text isn't chopped mid-sentence.
  const lines = text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim());

  lines.forEach((line, index) => {
    if (line.length === 0) {
      flush();
      return;
    }
    if (looksLikeHeading(line, lines[index + 1])) {
      flush();
      out.push(line);
      return;
    }
    buffer.push(line);
  });
  flush();

  return out;
}

function wordFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words(text)) {
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

export function extractKeywords(text: string, count = 15): string[] {
  const freq = mergePlurals(wordFrequencies(text));
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
}

/**
 * Pulls out multi-word topics as well as single ones.
 *
 * Counting single words alone splits "light-dependent reactions" into "light"
 * and "reactions", which names two things the document never discusses
 * separately. Runs of adjacent content words that recur are treated as one
 * topic, and any single word already inside a chosen phrase is dropped so the
 * list does not say both "genetic material" and "genetic".
 *
 * Phrases are read back from the source text rather than rebuilt from the
 * lowercased tokens, so hyphens, capitals and acronyms survive intact.
 */

const MAX_PHRASE_WORDS = 3;
const MIN_PHRASE_COUNT = 2;

interface Candidate {
  /** Lowercased, single-spaced, for counting. */
  key: string;
  /** As the document writes it, for display. */
  display: string;
  words: string[];
  count: number;
}

function collectPhrases(text: string): Map<string, Candidate> {
  const found = new Map<string, Candidate>();

  for (const sentence of splitIntoSentences(text)) {
    // Positions are kept so a phrase can be sliced back out with its original
    // punctuation — "light-dependent", not "light dependent".
    const tokens: { word: string; start: number; end: number }[] = [];
    const pattern = /[A-Za-z][A-Za-z0-9'-]*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sentence)) !== null) {
      tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }

    for (let i = 0; i < tokens.length; i++) {
      for (let size = 2; size <= MAX_PHRASE_WORDS && i + size <= tokens.length; size++) {
        const run = tokens.slice(i, i + size);

        // Every word must carry meaning: one stopword inside and the run is a
        // fragment of a sentence rather than the name of an idea.
        const usable = run.every(
          (token) => token.word.length >= 3 && !STOPWORDS.has(token.word.toLowerCase())
        );
        if (!usable) break;

        const key = run.map((token) => token.word.toLowerCase()).join(' ');
        const display = sentence.slice(run[0].start, run[run.length - 1].end);

        const existing = found.get(key);
        if (existing) existing.count += 1;
        else {
          found.set(key, {
            key,
            display,
            words: run.map((token) => token.word.toLowerCase()),
            count: 1,
          });
        }
      }
    }
  }

  return found;
}

export function extractTopics(text: string, count = 12): string[] {
  const singles = mergePlurals(wordFrequencies(text));
  const phrases = [...collectPhrases(text).values()]
    .filter((candidate) => candidate.count >= MIN_PHRASE_COUNT)
    // A longer phrase that recurs as often as a shorter one is the better name
    // for the idea, so length breaks the tie upwards.
    .sort((a, b) => b.count * b.words.length - a.count * a.words.length);

  const chosen: string[] = [];
  const spent = new Set<string>();

  /**
   * Marks a phrase's words as claimed, including the pieces of a hyphenated
   * one. The phrase tokenizer keeps "light-dependent" whole while the
   * single-word counter splits it, so without this the list ends up showing
   * "light-dependent reactions" and then "light" and "dependent" under it.
   */
  const claim = (word: string) => {
    spent.add(word);
    for (const piece of word.split(/[^a-z0-9']+/i)) {
      if (piece.length > 0) spent.add(piece.toLowerCase());
    }
  };

  for (const phrase of phrases) {
    if (chosen.length >= count) break;
    // Skip a phrase whose words are already claimed by a longer one taken above.
    if (phrase.words.some((word) => spent.has(word))) continue;

    chosen.push(phrase.display);
    phrase.words.forEach(claim);
  }

  const remaining = [...singles.entries()]
    .filter(([word]) => !spent.has(word))
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  for (const word of remaining) {
    if (chosen.length >= count) break;
    chosen.push(word);
  }

  return chosen;
}

export function generateSummary(text: string, maxSentences = 8): string[] {
  const sentences = splitIntoSentences(text).filter((s) => {
    const wc = words(s).length;
    return wc >= 6 && s.length <= 400;
  });
  if (sentences.length === 0) return [];

  const freq = wordFrequencies(text);
  const scored = sentences.map((s, idx) => {
    const sw = words(s);
    let score = 0;
    for (const w of sw) score += freq.get(w) || 0;
    score = score / Math.sqrt(sw.length + 1);
    const positionBonus = idx < sentences.length * 0.25 ? 1.2 : 1;
    return { s, score: score * positionBonus, idx };
  });

  const target = Math.min(maxSentences, sentences.length);
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, target);
  return top.sort((a, b) => a.idx - b.idx).map((t) => t.s.trim());
}

function findMostSignificantWord(sentence: string, freq: Map<string, number>): string | null {
  const candidates = (sentence.match(/[A-Za-z][A-Za-z0-9'-]{3,}/g) || []).filter(
    (w) => !STOPWORDS.has(w.toLowerCase())
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (freq.get(b.toLowerCase()) || 0) - (freq.get(a.toLowerCase()) || 0));
  return candidates[0];
}

interface DefinitionPair {
  term: string;
  definition: string;
}

function extractDefinitions(sentences: string[]): DefinitionPair[] {
  const defs: DefinitionPair[] = [];
  const patterns: RegExp[] = [
    /^([A-Z][A-Za-z0-9 '-]{2,40}?)\s+(?:is|are|was|were)\s+(?:defined as|known as|called)?\s*(.{15,250})$/,
    /^([A-Z][A-Za-z0-9 '-]{2,40}?)\s+refers to\s+(.{15,250})$/,
    /^([A-Z][A-Za-z0-9 '-]{2,40}?):\s+(.{15,250})$/,
    /^([A-Z][A-Za-z0-9 '-]{2,40}?)\s+means\s+(.{15,250})$/,
  ];

  for (const sentence of sentences) {
    const trimmed = sentence.trim().replace(/[.!?]+$/, '');
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const term = match[1].trim();
        const definition = match[2].trim();
        if (term.split(' ').length <= 6 && definition.length > 10) {
          defs.push({ term, definition: definition.charAt(0).toUpperCase() + definition.slice(1) });
        }
        break;
      }
    }
  }
  return defs;
}

export function generateFlashcards(text: string, count = 15): Flashcard[] {
  const sentences = splitIntoSentences(text).filter((s) => {
    const wc = words(s).length;
    return wc >= 6 && s.length <= 300;
  });
  const freq = wordFrequencies(text);
  const flashcards: Flashcard[] = [];
  const usedSentences = new Set<string>();

  const definitions = extractDefinitions(sentences);
  for (const def of definitions) {
    if (flashcards.length >= count) break;
    flashcards.push({
      id: `def-${flashcards.length}`,
      question: `What is ${def.term}?`,
      answer: def.definition,
      createdAt: new Date(),
    });
    usedSentences.add(def.term);
  }

  const remainingSentences = sentences
    .filter((s) => ![...usedSentences].some((t) => s.includes(t)))
    .sort((a, b) => {
      const scoreOf = (s: string) => words(s).reduce((sum, w) => sum + (freq.get(w) || 0), 0);
      return scoreOf(b) - scoreOf(a);
    });

  for (const sentence of remainingSentences) {
    if (flashcards.length >= count) break;
    const keyword = findMostSignificantWord(sentence, freq);
    if (!keyword) continue;
    const blanked = sentence.replace(new RegExp(`\\b${escapeRegExp(keyword)}\\b`), '_____');
    if (blanked === sentence) continue;
    flashcards.push({
      id: `cloze-${flashcards.length}`,
      question: `Fill in the blank: "${blanked.trim()}"`,
      answer: keyword,
      createdAt: new Date(),
    });
  }

  return flashcards;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateQuiz(text: string, flashcards: Flashcard[], count = 10): QuizQuestion[] {
  const pool = flashcards.slice(0, Math.max(count * 2, count));
  const allAnswers = flashcards.map((f) => f.answer);
  const quiz: QuizQuestion[] = [];

  for (const card of pool) {
    if (quiz.length >= count) break;

    const otherAnswers = allAnswers.filter((a) => a !== card.answer);
    const distractors = shuffle(otherAnswers).slice(0, 3);

    // For cloze-style (single word) answers, generate distractors from other keywords if not enough
    if (distractors.length < 3) {
      const keywords = extractKeywords(text, 30).filter(
        (k) => k.toLowerCase() !== card.answer.toLowerCase()
      );
      for (const kw of shuffle(keywords)) {
        if (distractors.length >= 3) break;
        if (!distractors.includes(kw)) distractors.push(kw);
      }
    }
    if (distractors.length < 2) continue;

    const options = shuffle([card.answer, ...distractors.slice(0, 3)]);
    const correctAnswer = options.indexOf(card.answer);

    quiz.push({
      id: `q-${quiz.length}`,
      text: card.question.startsWith('Fill in the blank')
        ? card.question
        : card.question,
      options,
      correctAnswer,
    });
  }

  return quiz;
}

export function analyzeDocument(rawText: string): DocumentAnalysis {
  const text = cleanText(rawText);
  const summary = generateSummary(text, 8);
  const keywords = extractTopics(text, 15);
  const flashcards = generateFlashcards(text, 15);
  const quiz = generateQuiz(text, flashcards, 10);
  const wordCount = words(text).length;

  return { summary, keywords, flashcards, quiz, wordCount };
}
