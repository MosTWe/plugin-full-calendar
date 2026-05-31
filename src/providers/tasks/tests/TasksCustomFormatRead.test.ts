import { extractTimeFromTitle } from '../taskPayloadAdapter';
import { TasksCustomTimeFormat } from '../../../types/settings';

const emojiEol: TasksCustomTimeFormat = {
  timeToken: 'HH:mm',
  prefix: '⏰ ',
  suffix: '',
  rangeSeparator: '–',
  position: 'endOfLine'
};

describe('extractTimeFromTitle — with custom format', () => {
  it('extracts a custom emoji block first', () => {
    expect(extractTimeFromTitle('Gym ⏰ 09:00–10:30', emojiEol)).toEqual({
      startTime: '09:00',
      endTime: '10:30',
      cleanTitle: 'Gym'
    });
  });

  it('still falls back to built-in parenthesized parsing for legacy tasks', () => {
    expect(extractTimeFromTitle('Meeting (18:00-20:00)', emojiEol)).toEqual({
      startTime: '18:00',
      endTime: '20:00',
      cleanTitle: 'Meeting'
    });
  });

  it('behaves exactly as before when no custom format is supplied', () => {
    expect(extractTimeFromTitle('Meeting (18:00)')).toEqual({
      startTime: '18:00',
      endTime: null,
      cleanTitle: 'Meeting'
    });
  });
});
