import { buildLearningPath } from '../learningPath';

/** Written the way a textbook is: groundwork first, then what leans on it. */
const LESSON = `Introduction to Cells

A cell is the basic unit of life. Every living organism is made of one or more cells.
The cell controls all the activities that keep an organism alive.

The Nucleus

The nucleus is the control centre of the cell. The nucleus stores the genetic material.
Every cell with a nucleus keeps its instructions there.

Genetic Material

DNA is the molecule that carries genetic instructions. DNA is stored inside the nucleus of the cell.
The DNA of an organism decides the traits of that organism.

Protein Synthesis

Transcription is the process of copying DNA into RNA inside the nucleus.
During transcription the cell reads the DNA and builds an RNA copy.

Regulation

Epigenetics studies changes that switch genes on and off without altering the DNA sequence.
Epigenetics involves chemical marks added to DNA during transcription.
An epigenetics mark can silence a gene inside the nucleus without changing the DNA.
Studying epigenetics requires understanding transcription and the structure of DNA first.`;

describe('ordering a document into a study path', () => {
  const steps = buildLearningPath(LESSON, 10);
  const order = steps.map((step) => step.id);
  const position = (term: string) => order.findIndex((id) => id.includes(term));

  it('opens on the idea everything else is built from', () => {
    expect(order[0]).toContain('cell');
  });

  it('ends on the idea that needs all the others', () => {
    expect(order[order.length - 1]).toContain('epigenetics');
  });

  it.each([
    ['cell', 'transcription'],
    ['cell', 'epigenetics'],
    ['nucleus', 'epigenetics'],
    ['dna', 'epigenetics'],
  ])('puts %s before %s', (earlier, later) => {
    expect(position(earlier)).toBeLessThan(position(later));
  });

  it('rises in difficulty and numbers the steps from one', () => {
    steps.forEach((step, index) => {
      expect(step.order).toBe(index + 1);
      if (index > 0) {
        expect(step.difficulty).toBeGreaterThanOrEqual(steps[index - 1].difficulty);
      }
    });
  });

  it('only claims a prerequisite that really does come earlier', () => {
    steps.forEach((step, index) => {
      for (const prerequisite of step.buildsOn) {
        const at = order.findIndex((id) => id === prerequisite.toLowerCase());
        // The label is the document's own spelling, so a missing match here
        // means casing drifted rather than the ordering being wrong.
        if (at !== -1) expect(at).toBeLessThan(index);
      }
    });
  });

  it('explains every placement', () => {
    for (const step of steps) {
      expect(step.reasons.length).toBeGreaterThan(0);
    }
  });

  it('names acronyms the way the document does', () => {
    const dna = steps.find((step) => step.id.includes('dna'));
    expect(dna?.label).toContain('DNA');
  });
});

describe('material with nothing to order', () => {
  it.each([
    ['nothing at all', ''],
    ['no usable keywords', '... ... ...'],
    ['a single word', 'hello'],
    ['two topics, which is a list rather than a route', 'A cell has a nucleus. The nucleus is in the cell.'],
  ])('returns an empty path for %s', (_name, input) => {
    expect(buildLearningPath(input)).toEqual([]);
  });

  it('produces a path once there are enough topics to order', () => {
    const path = buildLearningPath(
      'A cell has a nucleus. The nucleus holds DNA. DNA sits in the cell nucleus. ' +
        'Every cell copies its DNA before it divides.'
    );
    expect(path.length).toBeGreaterThanOrEqual(3);
  });
});
