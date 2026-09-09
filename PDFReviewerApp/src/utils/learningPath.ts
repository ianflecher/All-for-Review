import { extractKeywords, splitIntoSentences } from './textAnalysis';

/**
 * Turns a document into an ordered study path, foundations first.
 *
 * There is no way to measure real difficulty from text alone, so this ranks by
 * how the material itself builds up — which is the useful thing anyway, because
 * study material introduces what you need before it needs it. Five signals feed
 * the ranking, and each step carries the reasons for its placement so the order
 * can be judged rather than taken on faith.
 */

export type PathLevel = 'foundation' | 'building' | 'advanced';

export interface PathStep {
  id: string;
  label: string;
  /** 1-based position in the path. */
  order: number;
  level: PathLevel;
  /** 0 = most foundational, 1 = most advanced. */
  difficulty: number;
  /** Plain-language reasons for where this landed. */
  reasons: string[];
  /** Earlier steps this one is discussed alongside. */
  buildsOn: string[];
  /** Example sentences from the document. */
  contexts: string[];
  /** Barely connected to anything else — likely needs reading elsewhere. */
  isolated: boolean;
}

const LEVEL_LABELS: Record<PathLevel, string> = {
  foundation: 'Basics',
  building: 'Core',
  advanced: 'Advanced',
};

export function levelLabel(level: PathLevel): string {
  return LEVEL_LABELS[level];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordPattern(keyword: string): RegExp {
  // Word-boundary match so "cell" does not also match "excellent".
  return new RegExp(`\\b${escapeRegExp(keyword)}`, 'i');
}

/** "X is …", "X refers to …" — the shape of a definition sentence. */
function definitionPattern(keyword: string): RegExp {
  return new RegExp(
    `\\b${escapeRegExp(keyword)}\\w*\\s+(is|are|was|were|means|refers to|is called|is defined)\\b`,
    'i'
  );
}

/**
 * How the document itself writes the term, so acronyms survive.
 *
 * Keywords are lowercased for counting, and blindly re-capitalising the first
 * letter turns DNA into "Dna". The most common spelling in the source is the
 * right one; an all-lowercase winner is title-cased for display, anything that
 * already carries capitals is left exactly as written.
 */
function surfaceForm(text: string, keyword: string): string {
  const matches = text.match(new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'gi'));
  if (!matches || matches.length === 0) {
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  const counts = new Map<string, number>();
  for (const match of matches) counts.set(match, (counts.get(match) ?? 0) + 1);

  const [best] = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    // A tie goes to the form carrying capitals, so an acronym is not lost to
    // an equal number of sentence-initial lowercase hits.
    const aCaps = a[0] !== a[0].toLowerCase() ? 1 : 0;
    const bCaps = b[0] !== b[0].toLowerCase() ? 1 : 0;
    return bCaps - aCaps;
  })[0];

  return best === best.toLowerCase() ? best.charAt(0).toUpperCase() + best.slice(1) : best;
}

interface Stats {
  keyword: string;
  count: number;
  /** Index of the sentence where it first appears. */
  firstSeen: number;
  defined: boolean;
  contexts: string[];
}

export function buildLearningPath(text: string, maxSteps = 12): PathStep[] {
  const keywords = extractKeywords(text, maxSteps);
  if (keywords.length === 0) return [];

  const sentences = splitIntoSentences(text).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return [];

  const patterns = keywords.map((keyword) => ({
    keyword,
    word: wordPattern(keyword),
    definition: definitionPattern(keyword),
  }));

  const stats = new Map<string, Stats>();
  for (const keyword of keywords) {
    stats.set(keyword, { keyword, count: 0, firstSeen: -1, defined: false, contexts: [] });
  }

  const pairCounts = new Map<string, number>();

  sentences.forEach((sentence, index) => {
    const present: string[] = [];

    for (const { keyword, word, definition } of patterns) {
      if (!word.test(sentence)) continue;
      present.push(keyword);

      const entry = stats.get(keyword)!;
      entry.count += 1;
      if (entry.firstSeen < 0) entry.firstSeen = index;
      if (!entry.defined && definition.test(sentence)) entry.defined = true;
      if (entry.contexts.length < 3 && sentence.length < 320) {
        entry.contexts.push(sentence.trim());
      }
    }

    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        // Sorted so a<->b and b<->a share one bucket.
        const [a, b] = [present[i], present[j]].sort();
        const key = `${a}|${b}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  });

  const live = [...stats.values()].filter((entry) => entry.count > 0);
  if (live.length === 0) return [];

  const maxCount = Math.max(...live.map((entry) => entry.count));
  const lastSentence = Math.max(sentences.length - 1, 1);

  const cooccursWith = (a: string, b: string): number => {
    const [x, y] = [a, b].sort();
    return pairCounts.get(`${x}|${y}`) ?? 0;
  };

  const scored = live.map((entry) => {
    // Where the material first raises it. The strongest signal: study material
    // introduces the groundwork before the thing built on it.
    const introPosition = entry.firstSeen / lastSentence;

    // Core vocabulary recurs; a term mentioned once is usually a detail.
    const rarity = 1 - entry.count / maxCount;

    // Long, multi-part terms tend to name the more specialised ideas.
    const complexity = Math.min(1, (entry.keyword.length - 4) / 12);

    // Explained in terms of ideas the document raised earlier.
    const earlier = live.filter((other) => other.firstSeen < entry.firstSeen);
    const prerequisites = earlier.filter((other) => cooccursWith(entry.keyword, other.keyword) > 0);
    const prerequisiteLoad = live.length > 1 ? prerequisites.length / (live.length - 1) : 0;

    const difficulty =
      0.4 * introPosition +
      0.2 * rarity +
      0.15 * Math.max(0, complexity) +
      0.15 * prerequisiteLoad +
      0.1 * (entry.defined ? 0 : 1);

    const degree = live.reduce(
      (total, other) =>
        other.keyword === entry.keyword ? total : total + (cooccursWith(entry.keyword, other.keyword) > 0 ? 1 : 0),
      0
    );

    return { entry, difficulty, introPosition, prerequisites, degree };
  });

  scored.sort((a, b) => {
    const byDifficulty = a.difficulty - b.difficulty;
    // Ties fall back to which the document raised first, then to name, so the
    // order is stable between runs.
    if (Math.abs(byDifficulty) > 1e-9) return byDifficulty;
    if (a.entry.firstSeen !== b.entry.firstSeen) return a.entry.firstSeen - b.entry.firstSeen;
    return a.entry.keyword.localeCompare(b.entry.keyword);
  });

  const positionOf = new Map<string, number>();
  scored.forEach((item, index) => positionOf.set(item.entry.keyword, index));

  const labels = new Map<string, string>();
  for (const item of scored) labels.set(item.entry.keyword, surfaceForm(text, item.entry.keyword));

  const third = Math.max(1, Math.ceil(scored.length / 3));

  return scored.map((item, index) => {
    const { entry, difficulty, introPosition, prerequisites, degree } = item;

    const reasons: string[] = [];
    if (introPosition <= 0.34) reasons.push('Introduced early in the material');
    else if (introPosition >= 0.67) reasons.push('Only comes up later on');
    if (entry.defined) reasons.push('Defined in the text');
    reasons.push(`Mentioned ${entry.count} ${entry.count === 1 ? 'time' : 'times'}`);

    // Only prerequisites that really do sit earlier in the finished path.
    const buildsOn = prerequisites
      .filter((other) => (positionOf.get(other.keyword) ?? Infinity) < index)
      .sort((a, b) => cooccursWith(entry.keyword, b.keyword) - cooccursWith(entry.keyword, a.keyword))
      .slice(0, 3)
      .map((other) => labels.get(other.keyword) ?? other.keyword);

    if (buildsOn.length > 0) {
      reasons.push(`Explained using ${buildsOn.length} earlier idea${buildsOn.length === 1 ? '' : 's'}`);
    }

    const level: PathLevel =
      index < third ? 'foundation' : index < third * 2 ? 'building' : 'advanced';

    return {
      id: entry.keyword,
      label: labels.get(entry.keyword) ?? entry.keyword,
      order: index + 1,
      level,
      difficulty,
      reasons,
      buildsOn,
      contexts: entry.contexts,
      isolated: degree === 0,
    };
  });
}
