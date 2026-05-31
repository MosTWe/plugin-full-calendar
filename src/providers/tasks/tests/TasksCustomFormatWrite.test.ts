import { updateTimeInLine } from '../TasksPluginProvider';
import { TasksCustomTimeFormat } from '../../../types/settings';

const BASE = '- [ ] My task ⏳ 2024-06-15';
const WITH_STANDARD = '- [ ] My task (9:00-10:30) ⏳ 2024-06-15';

const emojiEol: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '⏰ ',
  suffix: '',
  rangeSeparator: '–',
  position: 'endOfLine'
};

describe('updateTimeInLine — custom format', () => {
  it('appends a custom emoji block at end of line', () => {
    expect(updateTimeInLine(BASE, '09:00', '10:30', true, '⏳', 'custom', emojiEol)).toBe(
      '- [ ] My task ⏳ 2024-06-15 ⏰ 09:00–10:30'
    );
  });

  it('migrates a legacy standard block to the custom block (no duplication)', () => {
    expect(updateTimeInLine(WITH_STANDARD, '09:00', '10:30', true, '⏳', 'custom', emojiEol)).toBe(
      '- [ ] My task ⏳ 2024-06-15 ⏰ 09:00–10:30'
    );
  });

  it('inserts a custom block before the date marker when position is beforeDate', () => {
    const beforeDate: TasksCustomTimeFormat = {
      timeToken: 'HH:mm',
      prefix: '(',
      suffix: ')',
      rangeSeparator: '-',
      position: 'beforeDate'
    };
    expect(updateTimeInLine(BASE, '09:00', null, true, '⏳', 'custom', beforeDate)).toBe(
      '- [ ] My task (09:00) ⏳ 2024-06-15'
    );
  });

  it('strips the custom block when startTime is null (all-day)', () => {
    const line = '- [ ] My task ⏳ 2024-06-15 ⏰ 09:00–10:30';
    expect(updateTimeInLine(line, null, null, true, '⏳', 'custom', emojiEol)).toBe(
      '- [ ] My task ⏳ 2024-06-15'
    );
  });

  it('preserves a block link with end-of-line custom block', () => {
    const line = '- [ ] My task ⏳ 2024-06-15 ^abc123';
    expect(updateTimeInLine(line, '09:00', null, true, '⏳', 'custom', emojiEol)).toBe(
      '- [ ] My task ⏳ 2024-06-15 ⏰ 09:00 ^abc123'
    );
  });

  it('writes a dayPlanner-position custom block after the checkbox', () => {
    const dayPlanner: TasksCustomTimeFormat = {
      timeToken: 'HH:mm',
      prefix: '',
      suffix: '',
      rangeSeparator: ' - ',
      position: 'dayPlanner'
    };
    expect(updateTimeInLine(BASE, '09:00', '10:30', true, '⏳', 'custom', dayPlanner)).toBe(
      '- [ ] 09:00 - 10:30 My task ⏳ 2024-06-15'
    );
  });

  it('falls back to standard behavior when displayFormat is custom but no customFormat is given', () => {
    expect(updateTimeInLine(BASE, '09:00', null, true, '⏳', 'custom')).toBe(
      '- [ ] My task (9:00) ⏳ 2024-06-15'
    );
  });
});
