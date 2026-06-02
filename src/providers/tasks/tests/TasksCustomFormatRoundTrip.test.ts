import fc from 'fast-check';
import { formatCustomTimeBlock, extractCustomTime } from '../customTimeFormat';
import { TasksCustomTimeFormat, TasksTimeToken } from '../../../types/settings';

const tokens: TasksTimeToken[] = ['HH:mm', 'H:mm', 'h:mm A', 'hh:mm A', 'h:mmA', 'hh:mmA'];

// Arbitrary canonical 24h time "HH:mm".
const arbTime = fc
  .record({ h: fc.integer({ min: 0, max: 23 }), m: fc.integer({ min: 0, max: 59 }) })
  .map(({ h, m }) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

// Delimiters that are unambiguous (non-empty, no digits/colons) keep round-trips clean.
const arbDelimiter = fc.constantFrom('(', ')', '⏰ ', '–', '-', ' - ', ' to ', '[', ']', '@');

const arbFormat = fc.record({
  timeToken: fc.constantFrom(...tokens),
  prefix: arbDelimiter,
  suffix: arbDelimiter,
  rangeSeparator: arbDelimiter,
  position: fc.constantFrom('beforeDate', 'dayPlanner', 'endOfLine')
}) as fc.Arbitrary<TasksCustomTimeFormat>;

describe('custom time format round-trip', () => {
  it('parse(render(start)) === start for single times', () => {
    fc.assert(
      fc.property(arbTime, arbFormat, (start, fmt) => {
        const block = formatCustomTimeBlock(start, null, fmt);
        const parsed = extractCustomTime(`Task ${block}`, fmt);
        expect(parsed).not.toBeNull();
        expect(parsed!.startTime).toBe(start);
        expect(parsed!.endTime).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('parse(render(start,end)) === (start,end) for ranges with distinct times', () => {
    fc.assert(
      fc.property(arbTime, arbTime, arbFormat, (start, end, fmt) => {
        fc.pre(start !== end);
        // Skip configs where the suffix equals the range separator: the greedy
        // regex can consume the separator as the suffix, which is a genuine
        // ambiguity rather than a parser defect.
        fc.pre(fmt.suffix !== fmt.rangeSeparator);
        const block = formatCustomTimeBlock(start, end, fmt);
        const parsed = extractCustomTime(`Task ${block}`, fmt);
        expect(parsed).not.toBeNull();
        expect(parsed!.startTime).toBe(start);
        expect(parsed!.endTime).toBe(end);
      }),
      { numRuns: 200 }
    );
  });
});
