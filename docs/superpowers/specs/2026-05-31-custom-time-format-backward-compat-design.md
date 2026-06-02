# Custom Task Time Format — Backward Compatibility Design

**Date:** 2026-05-31
**Branch:** feature/custom-timestamps
**Status:** Approved (pending spec review)

## Problem

The Obsidian Tasks integration now supports a `'custom'` time-display format (configurable time token, prefix, suffix, range separator, position). On read, `extractTimeFromTitle` tries the **current** custom format first, then the two built-in patterns (`standard` parenthesized + `dayPlanner` prefix).

The gap: when a user **changes their custom format settings**, tasks previously written under an **earlier custom configuration** are no longer recognized — their times would silently be lost (parsed as all-day). Past delimiters/tokens cannot be inferred after the fact, so the plugin must *remember* formats it previously wrote with.

## Goal

Ensure tasks written under any custom format the user has previously used remain readable after the user changes (or switches away from) their custom format — automatically, with a UI to inspect and prune the remembered formats.

## Decisions (from brainstorming)

1. **Scope:** prior custom configs only. Built-in `standard`/`dayPlanner` reading is already handled.
2. **Mechanism:** automatic capture into a history list, plus a settings UI to view/remove remembered formats.
3. **Read scope:** remembered formats are consulted on read **regardless of the current active format** — switching to a built-in format never orphans old custom-format tasks.
4. **Capture trigger:** session-boundary (Approach A) — snapshot the active custom format at modal open, commit to history at modal close if it is no longer the active writing format.

## Non-Goals

- A universal/lenient parser that recognizes formats the user never configured.
- Capturing every transient intermediate config edited within a single un-closed settings session (see Accepted Limitations).
- Changing the existing live-save-per-field behavior of the settings modal.

## Design

### 1. Data model

Add to `TasksIntegrationSettings` (`src/types/settings.ts`):

```ts
customTimeFormatHistory?: TasksCustomTimeFormat[];
```

Default in `DEFAULT_SETTINGS.tasksIntegration`: `customTimeFormatHistory: []`.

Each entry is a complete `TasksCustomTimeFormat` (the 5 fields: `timeToken`, `prefix`, `suffix`, `rangeSeparator`, `position`). Persisted in `data.json`. The settings load/merge (`utilsSettings.ts`) already shallow-spreads `tasksIntegration`; the array is replaced wholesale from persisted settings when present, else defaults to `[]` — no deep-merge needed for the array.

### 2. Capture (Approach A — session boundary)

Pure decision function (new, e.g. in `src/providers/tasks/customTimeFormat.ts` or a small `customTimeFormatHistory.ts`):

```ts
/**
 * Returns the updated history list given the format active when the settings
 * session started (`initial`, or null if not in custom mode at open), the
 * currently-saved custom format, whether custom is still the active display
 * format, and the existing history.
 */
function computeUpdatedHistory(
  initial: TasksCustomTimeFormat | null,
  current: TasksCustomTimeFormat,
  isCustomActive: boolean,
  history: TasksCustomTimeFormat[]
): TasksCustomTimeFormat[];
```

Rules:
- If `initial` is `null` (custom was not the active format at session open) → return `history` unchanged.
- Determine whether `initial` is **no longer the active writing format**: true if `!isCustomActive` (switched away from custom) **or** `!formatsEqual(initial, current)` (fields changed).
- If it is still active (custom active and unchanged) → return `history` unchanged.
- Otherwise, append `initial` to `history` **unless** an entry deep-equal to `initial` already exists (dedup against history only — NOT against `current`, so the switch-away case is captured).
- Cap the result at `MAX_HISTORY` (20). When over cap, evict oldest (FIFO).

`formatsEqual(a, b)` compares the 5 fields by value.

Modal integration (`TasksIntegrationSettingsModal.ts`):
- Capture `initialCustomFormat` **once** when the modal opens — guarded so the re-render path (`this.onOpen()` after `contentEl.empty()`) does not re-capture. Value: a deep copy of `customTimeFormat` if `taskDisplayFormat === 'custom'` at open, else `null`.
- In `onClose()`: compute `computeUpdatedHistory(initialCustomFormat, currentCustomFormat, taskDisplayFormat === 'custom', history)`; if it changed, assign it to `settings.customTimeFormatHistory` and `saveSettings()`.

The existing per-field live-save is unchanged; only the history commit is tied to the modal lifecycle.

### 3. Read path

Thread an ordered list of fallback formats through the read chain. Add an optional parameter `fallbackFormats?: TasksCustomTimeFormat[]` to:

- `extractTimeFromTitle(title, customFormat?, fallbackFormats?)`
- `getCleanTaskTitle(task, customFormat?, fallbackFormats?)`
- `taskToCalendarTask(task, customFormat?, fallbackFormats?)`
- `tasksToCalendarTasks(tasks, customFormat?, fallbackFormats?)`

`extractTimeFromTitle` precedence (first match wins):
1. `customFormat` (the active custom format, if any) via `extractCustomTime`
2. each `fallbackFormats[i]` in order via `extractCustomTime`
3. existing built-in patterns (dayPlanner range/single, parenthesized range/single)

Existing 1- and 2-arg call sites remain valid (the array is a distinct trailing optional param), so current tests are unaffected.

`parseTasksForCalendar` (`TasksPluginProvider.ts`) gathers:
- `customFormat = taskDisplayFormat === 'custom' ? customTimeFormat : undefined`
- `fallbackFormats` = `customTimeFormatHistory`, de-duplicated, with any entry deep-equal to `customFormat` removed (that entry is already tried first as `customFormat`).
- passes both to `tasksToCalendarTasks`.

Because `fallbackFormats` (history) is gathered regardless of the active display format, old custom-format tasks parse even when the active format is `standard`/`dayPlanner` (then `customFormat` is `undefined` and only history + built-ins are tried).

Resulting precedence end-to-end: **active custom → history (recent first) → built-in dayPlanner → built-in parenthesized**.

### 4. Manage-in-UI

In `TasksIntegrationSettingsModal`, render a **"Remembered formats"** section whenever `customTimeFormatHistory` is non-empty — shown regardless of the current active format (reading is always-on, so a user in `standard` mode must still be able to prune).

Each entry:
- A label rendering a sample block via `formatCustomTimeBlock('09:00', '10:30', entry)` (e.g. `⏰ 09:00–10:30`, `(09:00-10:30)`).
- A remove (×) button that splices the entry, `saveSettings()`, and re-renders.

Short helper text: "These formats are still recognized when reading existing tasks."

### 5. Testing

- **Unit (pure) — `computeUpdatedHistory`:**
  - captures `initial` when fields changed (custom still active)
  - captures `initial` when switched away from custom (fields unchanged)
  - no-op when custom active and unchanged
  - no-op when `initial` is null
  - dedups against existing history
  - respects `MAX_HISTORY` cap (FIFO eviction)
- **Unit — `extractTimeFromTitle` with `fallbackFormats`:**
  - tries fallbacks in order; first match wins
  - falls through to built-in patterns when no custom/fallback matches
  - behavior with no `fallbackFormats` is identical to today (existing tests stay green)
- **Integration:**
  - task written under format A parses when active format is B and history is `[A]`
  - task written under format A parses when active format is `standard` and history is `[A]`
- **Manage-UI:** not unit-tested (imperative Obsidian UI); verified by compile + lint, consistent with the existing custom sub-pane.

## Accepted Limitations

- Making several **distinct** custom-format changes within a single un-closed settings session preserves only the session-start format in history; intermediate configs are not captured. These intermediate configs are unlikely to have written tasks. Negligible for the real workflow (configure → use → later reconfigure).
- The history-based read tries multiple formats in sequence; as with the base custom feature, formats with empty/weak delimiters can in principle false-match. The active format is tried first, mitigating this. This is the same accepted trade-off as the original custom-format feature.

## Affected Files

- `src/types/settings.ts` — new field + default.
- `src/providers/tasks/customTimeFormat.ts` (or a new `customTimeFormatHistory.ts`) — `computeUpdatedHistory`, `formatsEqual`, `MAX_HISTORY`.
- `src/providers/tasks/taskPayloadAdapter.ts` — `fallbackFormats` threading.
- `src/providers/tasks/TasksPluginProvider.ts` — `parseTasksForCalendar` gathers fallbacks.
- `src/providers/tasks/TasksIntegrationSettingsModal.ts` — capture on open/close; "Remembered formats" section.
- `src/features/i18n/locales/en.json` — new strings (remembered-formats heading, helper text, remove button aria/label).
- Tests under `src/providers/tasks/tests/`.
- Docs under `docs/user/` + `docs/architecture/` (sync per CONTRIBUTING).
