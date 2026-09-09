import { addDays, todayISO } from '../datetime';
import {
  CardProgressMap,
  MAX_BOX,
  dueCount,
  isDue,
  masteredCount,
  orderByDue,
  recordAnswer,
} from '../spacedRepetition';

const today = todayISO();
const seen = (box: number, daysAgo = 0) => ({
  box,
  lastSeen: addDays(today, -daysAgo),
  missed: 0,
});

describe('when a card comes back', () => {
  it('treats a card it has never seen as due', () => {
    expect(isDue(undefined)).toBe(true);
  });

  it('brings box 1 back every session', () => {
    expect(isDue(seen(1))).toBe(true);
  });

  it.each([
    [2, 0, false],
    [2, 1, true],
    [3, 1, false],
    [3, 3, true],
    [5, 15, false],
    [5, 16, true],
  ])('box %i last seen %i days ago is due: %s', (box, daysAgo, expected) => {
    expect(isDue(seen(box, daysAgo))).toBe(expected);
  });
});

describe('answering', () => {
  it('promotes on a right answer and caps at the last box', () => {
    let map: CardProgressMap = {};
    map = recordAnswer(map, 'a', true);
    expect(map.a.box).toBe(2);

    for (let i = 0; i < 10; i++) map = recordAnswer(map, 'a', true);
    expect(map.a.box).toBe(MAX_BOX);
  });

  it('sends a missed card straight back to the first box and counts the miss', () => {
    let map = recordAnswer(recordAnswer({}, 'a', true), 'a', true);
    map = recordAnswer(map, 'a', false);

    expect(map.a.box).toBe(1);
    expect(map.a.missed).toBe(1);
  });
});

describe('deck order', () => {
  const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const map: CardProgressMap = {
    a: seen(5), // parked, not due
    b: { box: 1, lastSeen: today, missed: 3 }, // weak, due
    c: seen(3), // not due
    // d has never been seen, so it is due
  };

  it('puts due reviews ahead of cards never opened', () => {
    // The card missed three times matters more than one never started, and
    // burying reviews under new material is how a deck stops being revised.
    expect(orderByDue(cards, map).map((card) => card.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('keeps the original order when nothing has been answered', () => {
    expect(orderByDue(cards, {}).map((card) => card.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('survives an empty deck', () => {
    expect(orderByDue([], {})).toEqual([]);
  });

  it('counts what is due and what is finished', () => {
    expect(dueCount(cards, map)).toBe(2);
    expect(masteredCount(cards, map)).toBe(1);
  });
});
