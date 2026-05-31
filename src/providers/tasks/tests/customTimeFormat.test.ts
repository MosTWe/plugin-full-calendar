import { renderTimeToken, formatCustomTimeBlock, extractCustomTime, buildCustomStripRegex } from '../customTimeFormat';
import { TasksCustomTimeFormat } from '../../../types/settings';

describe('renderTimeToken', () => {
  it('renders HH:mm zero-padded 24h', () => {
    expect(renderTimeToken('9:00', 'HH:mm')).toBe('09:00');
    expect(renderTimeToken('09:00', 'HH:mm')).toBe('09:00');
  });

  it('renders H:mm without leading zero', () => {
    expect(renderTimeToken('09:00', 'H:mm')).toBe('9:00');
  });

  it('renders h:mm A as uppercase 12h', () => {
    expect(renderTimeToken('09:00', 'h:mm A')).toBe('9:00 AM');
    expect(renderTimeToken('13:30', 'h:mm A')).toBe('1:30 PM');
    expect(renderTimeToken('00:00', 'h:mm A')).toBe('12:00 AM');
    expect(renderTimeToken('12:00', 'h:mm A')).toBe('12:00 PM');
  });

  it('renders hh:mm A padded 12h', () => {
    expect(renderTimeToken('09:00', 'hh:mm A')).toBe('09:00 AM');
  });

  it('returns the raw input when the time cannot be parsed', () => {
    expect(renderTimeToken('not-a-time', 'HH:mm')).toBe('not-a-time');
  });
});

describe('formatCustomTimeBlock', () => {
  const parenFmt: TasksCustomTimeFormat = {
    timeToken: 'HH:mm',
    prefix: '(',
    suffix: ')',
    rangeSeparator: '-',
    position: 'beforeDate'
  };

  it('formats a single time', () => {
    expect(formatCustomTimeBlock('09:00', null, parenFmt)).toBe('(09:00)');
  });

  it('formats a range', () => {
    expect(formatCustomTimeBlock('09:00', '10:30', parenFmt)).toBe('(09:00-10:30)');
  });

  it('treats equal start and end as a single time', () => {
    expect(formatCustomTimeBlock('09:00', '09:00', parenFmt)).toBe('(09:00)');
  });

  it('honors emoji prefix and endash separator', () => {
    const emojiFmt: TasksCustomTimeFormat = {
      timeToken: 'HH:mm',
      prefix: '⏰ ',
      suffix: '',
      rangeSeparator: '–',
      position: 'endOfLine'
    };
    expect(formatCustomTimeBlock('09:00', '10:30', emojiFmt)).toBe('⏰ 09:00–10:30');
  });

  it('renders a range using a 12h token', () => {
    const twelveHour: TasksCustomTimeFormat = {
      timeToken: 'h:mm A',
      prefix: '(',
      suffix: ')',
      rangeSeparator: '-',
      position: 'beforeDate'
    };
    expect(formatCustomTimeBlock('09:00', '13:30', twelveHour)).toBe('(9:00 AM-1:30 PM)');
  });
});

describe('extractCustomTime', () => {
  const parenFmt: TasksCustomTimeFormat = {
    timeToken: 'HH:mm',
    prefix: '(',
    suffix: ')',
    rangeSeparator: '-',
    position: 'beforeDate'
  };

  it('extracts a single 24h time and cleans the title', () => {
    expect(extractCustomTime('Meeting (09:00)', parenFmt)).toEqual({
      startTime: '09:00',
      endTime: null,
      cleanTitle: 'Meeting'
    });
  });

  it('extracts a range', () => {
    expect(extractCustomTime('Standup (09:00-10:30)', parenFmt)).toEqual({
      startTime: '09:00',
      endTime: '10:30',
      cleanTitle: 'Standup'
    });
  });

  it('normalizes a 12h token back to 24h', () => {
    const fmt: TasksCustomTimeFormat = { ...parenFmt, timeToken: 'h:mm A' };
    expect(extractCustomTime('Lunch (1:30 PM)', fmt)).toEqual({
      startTime: '13:30',
      endTime: null,
      cleanTitle: 'Lunch'
    });
  });

  it('normalizes a padded 12h (hh:mm A) token back to 24h', () => {
    const fmt: TasksCustomTimeFormat = { ...parenFmt, timeToken: 'hh:mm A' };
    expect(extractCustomTime('Call (09:00 AM)', fmt)).toEqual({
      startTime: '09:00',
      endTime: null,
      cleanTitle: 'Call'
    });
  });

  it('extracts an emoji-prefixed range with endash', () => {
    const fmt: TasksCustomTimeFormat = {
      timeToken: 'HH:mm',
      prefix: '⏰ ',
      suffix: '',
      rangeSeparator: '–',
      position: 'endOfLine'
    };
    expect(extractCustomTime('Gym ⏰ 09:00–10:30', fmt)).toEqual({
      startTime: '09:00',
      endTime: '10:30',
      cleanTitle: 'Gym'
    });
  });

  it('returns null when no custom block is present', () => {
    expect(extractCustomTime('No time here', parenFmt)).toBeNull();
  });
});

describe('buildCustomStripRegex', () => {
  it('matches the custom block for removal', () => {
    const fmt: TasksCustomTimeFormat = {
      timeToken: 'HH:mm',
      prefix: '(',
      suffix: ')',
      rangeSeparator: '-',
      position: 'beforeDate'
    };
    const stripped = '- [ ] Task (09:00-10:30) ⏳ 2024-06-15'.replace(buildCustomStripRegex(fmt), '');
    expect(stripped.replace(/\s+/g, ' ').trim()).toBe('- [ ] Task ⏳ 2024-06-15');
  });
});
