// src/providers/tasks/customTimeFormat.ts
/**
 * @file customTimeFormat.ts
 * @brief Pure render/parse/strip logic for the Tasks integration's 'custom'
 *        time-display format. Canonical time representation is 24h "HH:mm".
 */

import { DateTime } from 'luxon';
import { TasksCustomTimeFormat, TasksTimeToken } from '../../types/settings';

/** Luxon format string for each supported token. */
const TOKEN_LUXON: Record<TasksTimeToken, string> = {
  'HH:mm': 'HH:mm',
  'H:mm': 'H:mm',
  'h:mm A': 'h:mm a',
  'hh:mm A': 'hh:mm a'
};

/** Parses a loosely-formatted input time into a Luxon DateTime (24h "HH:mm" preferred). */
function parseInputTime(time: string): DateTime {
  // 'h:mm a' parses both lowercase and uppercase AM/PM input.
  for (const fmt of ['HH:mm', 'H:mm', 'h:mm a']) {
    const parsed = DateTime.fromFormat(time.trim(), fmt);
    if (parsed.isValid) {
      return parsed;
    }
  }
  return DateTime.invalid('unparseable time');
}

/**
 * Renders a canonical 24h "HH:mm" time into the configured token display.
 * Falls back to the raw input if it cannot be parsed.
 */
export function renderTimeToken(time: string, token: TasksTimeToken): string {
  const dt = parseInputTime(time);
  if (!dt.isValid) {
    return time;
  }
  const out = dt.toFormat(TOKEN_LUXON[token]);
  return token.includes('A') ? out.toUpperCase() : out;
}

/**
 * Builds the time-block string for a custom format:
 *   prefix + token(start) [+ rangeSeparator + token(end)] + suffix
 * `endTime` equal to `startTime` (or null) produces a single-time block.
 */
export function formatCustomTimeBlock(
  startTime: string,
  endTime: string | null,
  fmt: TasksCustomTimeFormat
): string {
  const start = renderTimeToken(startTime, fmt.timeToken);
  const includeEnd = endTime !== null && endTime !== startTime;
  const inner = includeEnd
    ? `${start}${fmt.rangeSeparator}${renderTimeToken(endTime, fmt.timeToken)}`
    : start;
  return `${fmt.prefix}${inner}${fmt.suffix}`;
}
