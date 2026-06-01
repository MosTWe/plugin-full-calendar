import { extractTimeFromTitle, tasksToCalendarTasks } from '../taskPayloadAdapter';
import { TasksCustomTimeFormat } from '../../../types/settings';
import { TasksPluginTask } from '../taskPayloadAdapter';

const formatA: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '⏰ ',
  suffix: '',
  rangeSeparator: '–',
  position: 'endOfLine'
};
const formatB: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '(',
  suffix: ')',
  rangeSeparator: '-',
  position: 'beforeDate'
};
const formatC: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '[',
  suffix: ']',
  rangeSeparator: '/',
  position: 'endOfLine'
};

describe('extractTimeFromTitle — fallbackFormats', () => {
  it('tries fallback formats after the primary, first match wins', () => {
    expect(extractTimeFromTitle('Gym ⏰ 09:00–10:30', formatB, [formatA])).toEqual({
      startTime: '09:00',
      endTime: '10:30',
      cleanTitle: 'Gym'
    });
  });

  it('falls through to built-in patterns when neither primary nor fallbacks match', () => {
    expect(extractTimeFromTitle('Meeting (18:00)', formatA, [formatC])).toEqual({
      startTime: '18:00',
      endTime: null,
      cleanTitle: 'Meeting'
    });
  });

  it('is unchanged when no fallbackFormats are given', () => {
    expect(extractTimeFromTitle('Meeting (18:00)')).toEqual({
      startTime: '18:00',
      endTime: null,
      cleanTitle: 'Meeting'
    });
  });
});

describe('tasksToCalendarTasks — fallbackFormats threading', () => {
  it('parses a task written under a prior format via fallbackFormats', () => {
    const task: TasksPluginTask = {
      path: 'notes/a.md',
      description: 'Gym ⏰ 09:00–10:30',
      taskLocation: { lineNumber: 0 },
      originalMarkdown: '- [ ] Gym ⏰ 09:00–10:30'
    };
    const result = tasksToCalendarTasks([task], formatB, [formatA]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Gym');
    expect(result[0].startTime).toBe('09:00');
    expect(result[0].endTime).toBe('10:30');
  });
});
