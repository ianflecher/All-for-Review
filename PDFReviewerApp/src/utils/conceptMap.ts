import { extractKeywords, splitIntoSentences } from './textAnalysis';

export interface ConceptNode {
  id: string;
  label: string;
  /** How often the concept appears — drives node size. */
  weight: number;
}

export interface ConceptEdge {
  source: string;
  target: string;
  /** Number of sentences mentioning both concepts. */
  weight: number;
}

export interface ConceptMap {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  /** Concept id -> example sentences, so a tapped node can show its context. */
  contexts: Record<string, string[]>;
}

function keywordPattern(keyword: string): RegExp {
  // Word-boundary match so "cell" does not match "excellent".
  return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
}

/**
 * Builds a concept graph: the most significant terms become nodes, and two
 * terms are linked when they are discussed in the same sentence. Co-occurrence
 * is a cheap but effective proxy for "these ideas are related", and it keeps
 * the whole thing offline and dependency-free.
 */
export function buildConceptMap(text: string, maxNodes = 12): ConceptMap {
  const keywords = extractKeywords(text, maxNodes);
  if (keywords.length === 0) {
    return { nodes: [], edges: [], contexts: {} };
  }

  const sentences = splitIntoSentences(text).filter((s) => s.trim().length > 0);

  const counts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  const contexts: Record<string, string[]> = {};

  for (const keyword of keywords) {
    counts.set(keyword, 0);
    contexts[keyword] = [];
  }

  // Compiled once: a long document can run this against thousands of sentences.
  const patterns = keywords.map((k) => ({ keyword: k, re: keywordPattern(k) }));

  for (const sentence of sentences) {
    const present: string[] = [];
    for (const { keyword, re } of patterns) {
      if (re.test(sentence)) present.push(keyword);
    }

    for (const keyword of present) {
      counts.set(keyword, (counts.get(keyword) || 0) + 1);
      const bucket = contexts[keyword];
      if (bucket.length < 3 && sentence.length < 320) {
        bucket.push(sentence.trim());
      }
    }

    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        // Sort the pair so a<->b and b<->a share one bucket.
        const [a, b] = [present[i], present[j]].sort();
        const key = `${a}|${b}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const nodes: ConceptNode[] = keywords
    .map((k) => ({ id: k, label: k, weight: counts.get(k) || 0 }))
    .filter((n) => n.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const liveIds = new Set(nodes.map((n) => n.id));

  const edges: ConceptEdge[] = [...pairCounts.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split('|');
      return { source, target, weight };
    })
    .filter((e) => liveIds.has(e.source) && liveIds.has(e.target))
    .sort((a, b) => b.weight - a.weight)
    // Keep the graph readable rather than a hairball.
    .slice(0, 24);

  return { nodes, edges, contexts };
}

/** Concepts that appear often but connect to little else — likely gaps to review. */
export function findIsolatedConcepts(map: ConceptMap): string[] {
  const degree = new Map<string, number>();
  for (const node of map.nodes) degree.set(node.id, 0);
  for (const edge of map.edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }
  return map.nodes.filter((n) => (degree.get(n.id) || 0) <= 1).map((n) => n.id);
}
