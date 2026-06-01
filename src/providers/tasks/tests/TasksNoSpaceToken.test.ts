/**
 * @file TasksNoSpaceToken.test.ts
 * @brief Covers the no-space meridiem tokens (`h:mmA` / `hh:mmA`) and tolerance
 *        for no-space AM/PM input — the form the Obsidian Tasks plugin writes
 *        when it normalizes an embedded time (e.g. "9:45 AM" -> "9:45AM").
 */

import { renderTimeToken, formatCustomTimeBlock, extractCustomTime } from '../customTimeFormat';
import { TasksCustomTimeFormat } from '../../../types/settings';

describe('no-space meridiem token (h:mmA / hh:mmA)', () => {
  describe('renderTimeToken', () => {
    it('renders h:mmA with no space before the meridiem', () => {
      expect(renderTimeToken('09:00', 'h:mmA')).toBe('9:00AM');
      expect(renderTimeToken('13:30', 'h:mmA')).toBe('1:30PM');
      expect(renderTimeToken('00:00', 'h:mmA')).toBe('12:00AM');
      expect(renderTimeToken('12:00', 'h:mmA')).toBe('12:00PM');
    });

    it('renders hh:mmA padded with no space', () => {
      expect(renderTimeToken('09:00', 'hh:mmA')).toBe('09:00AM');
    });
  });

  describe('formatCustomTimeBlock', () => {
    it('produces the compact form the Tasks plugin writes', () => {
      const fmt: TasksCustomTimeFormat = {
        timeToken: 'h:mmA',
        prefix: '',
        suffix: '',
        rangeSeparator: '-',
        position: 'dayPlanner'
      };
      expect(formatCustomTimeBlock('09:45', '10:00', fmt)).toBe('9:45AM-10:00AM');
    });
  });

  describe('extractCustomTime', () => {
    it('round-trips the compact range via a no-space token format', () => {
      const fmt: TasksCustomTimeFormat = {
        timeToken: 'h:mmA',
        prefix: '',
        suffix: '',
        rangeSeparator: '-',
        position: 'dayPlanner'
      };
      expect(extractCustomTime('9:45AM-10:00AM Task', fmt)).toEqual({
        startTime: '09:45',
        endTime: '10:00',
        cleanTitle: 'Task'
      });
    });

    it('tolerates no-space input even when the configured token is spaced (h:mm A)', () => {
      // Reproduces the bug: the Tasks plugin rewrites "9:45 AM" as "9:45AM".
      // The spaced token's matcher already allows optional whitespace, so the
      // time must still be recovered on read.
      const fmt: TasksCustomTimeFormat = {
        timeToken: 'h:mm A',
        prefix: '',
        suffix: '',
        rangeSeparator: ' - ',
        position: 'dayPlanner'
      };
      expect(extractCustomTime('9:45AM Task', fmt)).toEqual({
        startTime: '09:45',
        endTime: null,
        cleanTitle: 'Task'
      });
    });
  });
});
