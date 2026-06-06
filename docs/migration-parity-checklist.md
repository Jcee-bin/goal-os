# Migration Parity Checklist

Verified: 2026-06-06

## Goal OS

- [x] Identity statement and arena are editable through the API.
- [x] Identity changes create matching XP and evidence.
- [x] Habits support create, complete, inspect, delete, daily targets, XP, and
  morning/afternoon/night/anytime grouping.
- [x] Daily completion limits are enforced server-side.
- [x] Completion history drives streaks and seven-day analytics.
- [x] Goals support create, progress, delete, ongoing, and Monday-based weekly
  rollover.
- [x] Goal progress and one-time completion bonuses create XP/evidence events.
- [x] Dashboard includes identity, XP/level, productivity, habits, goals,
  evidence, tips, milestones, system insight, and finance summary.
- [x] Floating focus timer supports focus/break modes, settings, countdown
  persistence, dragging, and compact minimize state.
- [x] Reset Logs clears progress/evidence/XP while preserving configuration.

Evidence: `server/test/activity.test.js`, React component tests, desktop and
390px Chromium screenshots.

## Tasks and Schedule

- [x] Inbox, Overdue, Anytime, Timeline, and Completed task sections are present.
- [x] One-off tasks support areas, priorities, notes, dates, time blocks, edit,
  complete, reopen, reschedule, and delete.
- [x] Overlapping time blocks are allowed with a visible warning.
- [x] Tasks do not award XP.
- [x] Dashboard includes a compact schedule preview.
- [x] Selected timed tasks can publish one-way to a dedicated Google Calendar.
- [x] Refresh tokens are encrypted, sync failures preserve local changes, and
  failed task syncs can be retried.
- [x] Completion, reopening, missing-event recreation, disconnect, and queued
  offline deletion are covered by integration tests.

Evidence: `server/test/tasks.test.js`, `server/test/googleCalendar.test.js`,
`TodayView.test.jsx`, and live desktop/mobile browser verification.

## Budget

- [x] Income can be assigned to cash, bank, or savings.
- [x] Paid expenses reduce their selected account.
- [x] To-pay expenses remain projected until paid.
- [x] Paying selected expenses requires a cash/bank/savings account choice.
- [x] Paid entries can be returned to to-pay.
- [x] Saving transfers move cash/bank into savings.
- [x] Insufficient funds are rejected.
- [x] Deletion restores ledger totals naturally.
- [x] Bulk delete, status, and category actions are transactional.
- [x] Status/category/date filtering and ten-row pagination are present.
- [x] Current/projected 50/30/20, spending trend, totals, and safe-to-spend are
  rendered.
- [x] Ledger-backed 14-day sparklines render on every money summary.
- [x] To-pay category shape and the five largest charges are rendered.
- [x] Budget reset is available.

Evidence: `server/test/finance.test.js`, `TransactionForm.test.jsx`, live
Chromium workflow adding income, adding to-pay, selecting it, marking paid, and
desktop/mobile visual verification.

## Import and Compatibility

- [x] Original vanilla files remain in the repository.
- [x] Original Goal OS can export both localStorage payloads to JSON.
- [x] React can import the JSON explicitly once.
- [x] Legacy pending/savings labels and peso amounts are normalized.
- [x] Prototype SQLite schemas are rebuilt safely before current migrations.
- [x] Supabase-compatible schema and RLS templates are documented.

Evidence: `server/test/import.test.js`, `server/sql/supabase-schema.sql`.

## Quality Gates

- [x] Server tests pass.
- [x] Client tests pass.
- [x] Client lint passes.
- [x] Production build passes with route-level chart code splitting.
- [x] Desktop width has no horizontal overflow.
- [x] 390px width has no horizontal overflow.
- [x] Budget charts mount.
- [x] Focus timer starts, counts down, and minimizes.
- [x] Runtime browser console has no errors.
