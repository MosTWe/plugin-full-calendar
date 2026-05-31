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

/** Escapes a literal string for safe use inside a RegExp. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex fragment (no capture) that matches one rendered token of the given type. */
function tokenMatchFragment(token: TasksTimeToken): string {
  switch (token) {
    case 'HH:mm':
      return String.raw`\d{2}:\d{2}`;
    case 'H:mm':
      return String.raw`\d{1,2}:\d{2}`;
    case 'h:mm A':
      return String.raw`\d{1,2}:\d{2}\s*[AaPp][Mm]`;
    case 'hh:mm A':
      return String.raw`\d{2}:\d{2}\s*[AaPp][Mm]`;
    default:
      throw new Error(`Unsupported time token: ${token satisfies never}`);
  }
}

/** Parses one rendered token back into canonical 24h "HH:mm". */
function parseTokenTo24h(raw: string): string | null {
  const dt = parseInputTime(raw);
  return dt.isValid ? dt.toFormat('HH:mm') : null;
}

/**
 * Builds a RegExp that captures the start token and (optional) end token of a
 * custom time block. Group 1 = start, group 2 = end (may be undefined).
 */
function buildCustomMatchRegex(fmt: TasksCustomTimeFormat): RegExp {
  const tok = tokenMatchFragment(fmt.timeToken);
  const pre = escapeRegExp(fmt.prefix);
  const suf = escapeRegExp(fmt.suffix);
  const sep = escapeRegExp(fmt.rangeSeparator);
  return new RegExp(`${pre}(${tok})(?:${sep}(${tok}))?${suf}`);
}

/**
 * Builds a global RegExp for removing the custom block, consuming the single
 * run of whitespace BEFORE the block (not after) so the gap to the following
 * token is preserved. Callers are expected to normalize residual whitespace.
 */
export function buildCustomStripRegex(fmt: TasksCustomTimeFormat): RegExp {
  const inner = buildCustomMatchRegex(fmt).source;
  return new RegExp(`\\s*(?:${inner})`, 'g');
}

/**
 * Extracts start/end times from a title using the custom format. Returns the
 * canonical 24h times plus the title with the block removed, or null if absent.
 */
export function extractCustomTime(
  title: string,
  fmt: TasksCustomTimeFormat
): { startTime: string; endTime: string | null; cleanTitle: string } | null {
  const match = title.match(buildCustomMatchRegex(fmt));
  if (!match) {
    return null;
  }
  const startTime = parseTokenTo24h(match[1]);
  if (!startTime) {
    return null;
  }
  const endTime = match[2] ? parseTokenTo24h(match[2]) : null;
  const cleanTitle = title.replace(match[0], '').replace(/\s+/g, ' ').trim();
  return { startTime, endTime, cleanTitle };
}
