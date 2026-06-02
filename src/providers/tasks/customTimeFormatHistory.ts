// src/providers/tasks/customTimeFormatHistory.ts
/**
 * @file customTimeFormatHistory.ts
 * @brief Pure logic for the remembered-format history that keeps tasks written
 *        under prior custom time formats readable after the user changes formats.
 */

import { TasksCustomTimeFormat } from '../../types/settings';

/** Maximum number of remembered prior custom formats (oldest evicted past this). */
export const MAX_HISTORY = 20;

/** Value-equality across all five fields of a custom time format. */
export function formatsEqual(a: TasksCustomTimeFormat, b: TasksCustomTimeFormat): boolean {
  return (
    a.timeToken === b.timeToken &&
    a.prefix === b.prefix &&
    a.suffix === b.suffix &&
    a.rangeSeparator === b.rangeSeparator &&
    a.position === b.position
  );
}

/**
 * Removes value-duplicate formats, preserving first-seen order.
 * ALWAYS returns a new array (never the input reference), so callers must not
 * use it for identity-based change detection.
 */
export function dedupeFormats(formats: TasksCustomTimeFormat[]): TasksCustomTimeFormat[] {
  const out: TasksCustomTimeFormat[] = [];
  for (const f of formats) {
    if (!out.some(existing => formatsEqual(existing, f))) {
      out.push(f);
    }
  }
  return out;
}

/**
 * Computes the remembered-format history at the end of a settings session.
 *
 * @param initial        The custom format active when the session opened, or null
 *                       if 'custom' was not the active format at open.
 * @param current        The custom format currently saved.
 * @param isCustomActive Whether 'custom' is still the active display format.
 * @param history        The existing remembered-format list (oldest first).
 *                       Assumes `history` is already duplicate-free (this module is its sole writer).
 * @returns The same `history` reference when nothing is captured, otherwise a new
 *          array with `initial` appended (deduped, capped at MAX_HISTORY, oldest evicted).
 *
 * `initial` is captured when it is no longer the active writing format — i.e. the
 * fields changed OR 'custom' is no longer active. Dedup is against `history` only
 * (NOT `current`), so switching away from an unchanged custom format still captures it.
 */
export function computeUpdatedHistory(
  initial: TasksCustomTimeFormat | null,
  current: TasksCustomTimeFormat,
  isCustomActive: boolean,
  history: TasksCustomTimeFormat[]
): TasksCustomTimeFormat[] {
  if (!initial) {
    return history;
  }
  const stillActive = isCustomActive && formatsEqual(initial, current);
  if (stillActive) {
    return history;
  }
  if (history.some(h => formatsEqual(h, initial))) {
    return history;
  }
  const updated = [...history, initial];
  return updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;
}
