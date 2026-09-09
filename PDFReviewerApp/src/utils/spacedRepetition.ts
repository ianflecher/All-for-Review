import { addDays, daysUntil, todayISO } from './datetime';

/**
 * Leitner scheduling for the flashcards.
 *
 * A card you keep getting right should stop taking up your time, and one you
 * keep missing should keep coming back. Each card sits in a box: getting it
 * right moves it up and pushes the next review further out, getting it wrong
 * sends it straight back to box 1 and it returns the same day.
 */

export interface CardProgress {
  /** 1 = due every session, rising to REVIEW_GAPS.length = due rarely. */
  box: number;
  /** ISO date of the last answer. */
  lastSeen: string;
  /** How many times it has been missed, shown as "still tricky". */
  missed: number;
}

export type CardProgressMap = Record<string, CardProgress>;

/** Days to wait before a card in each box comes back. Index 0 is box 1. */
export const REVIEW_GAPS = [0, 1, 3, 7, 16];

export const MAX_BOX = REVIEW_GAPS.length;

export function isDue(progress: CardProgress | undefined, today = todayISO()): boolean {
  if (!progress) return true; // never seen, so always due

  const gap = REVIEW_GAPS[Math.min(progress.box, MAX_BOX) - 1] ?? 0;
  if (gap === 0) return true;

  const dueOn = addDays(progress.lastSeen, gap);
  const daysAway = daysUntil(dueOn);
  return daysAway === null || daysAway <= 0;
}

export function recordAnswer(
  map: CardProgressMap,
  cardId: string,
  knewIt: boolean
): CardProgressMap {
  const existing = map[cardId];
  const box = knewIt ? Math.min((existing?.box ?? 1) + 1, MAX_BOX) : 1;

  return {
    ...map,
    [cardId]: {
      box,
      lastSeen: todayISO(),
      missed: (existing?.missed ?? 0) + (knewIt ? 0 : 1),
    },
  };
}

/**
 * Due cards first, weakest first within those, then the rest.
 *
 * A card with no progress is ranked below every due review rather than above
 * it: something you have already missed twice is more urgent than something
 * you have never opened, and burying reviews under a wall of new cards is how
 * a deck stops getting revised. Ties keep the original order, so the deck does
 * not reshuffle under you mid-session.
 */
export function orderByDue<T extends { id: string }>(cards: T[], map: CardProgressMap): T[] {
  const today = todayISO();
  // Unseen cards sort after any box, inside whichever group they land in.
  const rank = (progress: CardProgress | undefined) => progress?.box ?? MAX_BOX + 1;

  return cards
    .map((card, index) => ({ card, index, progress: map[card.id] }))
    .sort((a, b) => {
      const aDue = isDue(a.progress, today);
      const bDue = isDue(b.progress, today);
      if (aDue !== bDue) return aDue ? -1 : 1;

      const byRank = rank(a.progress) - rank(b.progress);
      if (byRank !== 0) return byRank;

      return a.index - b.index;
    })
    .map((entry) => entry.card);
}

export function dueCount<T extends { id: string }>(cards: T[], map: CardProgressMap): number {
  const today = todayISO();
  return cards.filter((card) => isDue(map[card.id], today)).length;
}

/** Cards that have reached the last box — learned, for now. */
export function masteredCount<T extends { id: string }>(cards: T[], map: CardProgressMap): number {
  return cards.filter((card) => (map[card.id]?.box ?? 0) >= MAX_BOX).length;
}
