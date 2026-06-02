import {
  formatsEqual,
  dedupeFormats,
  computeUpdatedHistory,
  MAX_HISTORY
} from '../customTimeFormatHistory';
import { TasksCustomTimeFormat } from '../../../types/settings';

const A: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '(',
  suffix: ')',
  rangeSeparator: '-',
  position: 'beforeDate'
};
const B: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '⏰ ',
  suffix: '',
  rangeSeparator: '–',
  position: 'endOfLine'
};

describe('formatsEqual', () => {
  it('is true for value-equal formats', () => {
    expect(formatsEqual(A, { ...A })).toBe(true);
  });
  it('is false when any field differs', () => {
    expect(formatsEqual(A, { ...A, prefix: '[' })).toBe(false);
  });
});

describe('dedupeFormats', () => {
  it('removes value-duplicates preserving first-seen order', () => {
    expect(dedupeFormats([A, { ...A }, B])).toEqual([A, B]);
  });
  it('returns an empty array for empty input', () => {
    expect(dedupeFormats([])).toEqual([]);
  });
  it('collapses an all-duplicate list to a single entry', () => {
    expect(dedupeFormats([A, { ...A }, { ...A }])).toEqual([A]);
  });
});

describe('computeUpdatedHistory', () => {
  it('returns history unchanged when initial is null', () => {
    const h = [A];
    expect(computeUpdatedHistory(null, B, true, h)).toBe(h);
  });

  it('returns history unchanged when custom still active and unchanged', () => {
    const h: TasksCustomTimeFormat[] = [];
    expect(computeUpdatedHistory(A, { ...A }, true, h)).toBe(h);
  });

  it('captures initial when fields changed (custom still active)', () => {
    expect(computeUpdatedHistory(A, B, true, [])).toEqual([A]);
  });

  it('captures initial when switched away from custom (fields unchanged)', () => {
    expect(computeUpdatedHistory(A, { ...A }, false, [])).toEqual([A]);
  });

  it('dedups against existing history', () => {
    const h = [A];
    expect(computeUpdatedHistory(A, B, false, h)).toBe(h);
  });

  it('evicts oldest when over the cap', () => {
    const history: TasksCustomTimeFormat[] = Array.from({ length: MAX_HISTORY }, (_, i) => ({
      ...A,
      suffix: `s${i}`
    }));
    const initial: TasksCustomTimeFormat = { ...A, suffix: 'NEW' };
    const result = computeUpdatedHistory(initial, B, false, history);
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[result.length - 1]).toEqual(initial);
    expect(result[0]).toEqual({ ...A, suffix: 's1' });
    expect(result).not.toContainEqual({ ...A, suffix: 's0' });
  });
});
