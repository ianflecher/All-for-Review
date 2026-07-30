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
]);

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

export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [normalized];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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
  const freq = wordFrequencies(text);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
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
  const keywords = extractKeywords(text, 15);
  const flashcards = generateFlashcards(text, 15);
  const quiz = generateQuiz(text, flashcards, 10);
  const wordCount = words(text).length;

  return { summary, keywords, flashcards, quiz, wordCount };
}
