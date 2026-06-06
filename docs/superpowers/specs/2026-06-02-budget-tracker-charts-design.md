# Budget Tracker — Charts, Period Filter & Visual Overview (Design Spec)

Date: 2026-06-02
Status: Approved (design); ready for implementation plan

## Context

The Budget Tracker (`index.html` + `styles.css` + `app.js` in
`C:\Users\shend\Documents\Codex\2026-05-16\goal`) was recently calmed (hero + compact stat
strip, segmented add-forms, hidden bulk bar). The user finds it still too number-heavy and
wants the overview to be more visual and glanceable, plus the ability to view analysis by
time period. Brainstormed and approved via the visual companion.

Goal: make the money overview read at a glance with interactive (hover-for-amount) charts,
and add a period filter to the analysis section — without disturbing balances, history,
forms, or bulk logic.

## Approved decisions

- **Period selector**: `This week | This month | Last month | All time`. It drives **only**
  the analysis section (spending trend + 50/30/20 donut). Account balances and the history
  list stay always-current. One shared selector controls both analysis widgets.
- **Spending trend (new)**: a full area/line chart of spending across the selected period,
  with a peso **Y-axis** (gridlines + ₱ labels) and day labels on the X-axis. Hover a point
  → tooltip with that day's date + amount.
- **50/30/20 → donut only**: keep the existing donut (the user likes it). **Remove** the
  separate three-bar `.budget-split` "50/30/20 Check" block (redundant with the donut). The
  donut card carries a legend: Needs / Wants / Debt-Saving, each with amount, %, and target.
  **Hover a donut slice (e.g. orange = Wants) → tooltip with that category's total for the
  selected period.** Keep the existing **Current / Projected** toggle on this card.
- **Layout**: spending trend (left, wider ~1.5fr) and the donut (right, ~1fr) sit **side by
  side** in one "Analysis" row, sharing the period selector above them. Avoids the trend
  looking stretched.
- **Sparkline tiles**: the existing stat tiles (Cash, Bank, Savings, Total Spent, To Pay,
  Current Money, Total Tracked) keep their number and gain a small inline-SVG trend line of
  that metric's recent movement; hover a point → amount + date.
- **Untouched**: "To Pay Shape" mini-bars, "Biggest Charges," all balances, history,
  filters, pagination, the three add-forms, and bulk actions.

Net effect: graph count does **not** balloon — we drop the 3-bar block, keep the donut, add
one trend chart, and add subtle sparklines.

## Visual direction
Continue the current warm-calm, one-accent system (OKLCH tokens already in `styles.css`).
Chart colors reuse existing semantic tokens: accent green for spending/needs, `--warm`
amber for wants, `--savings` indigo for debt/saving. All charts are **hand-rolled inline
SVG** — no chart library, no build step. Tooltips are plain JS.

## Data sourcing (no new storage)
All series derive from the existing `state.entries` (each entry has `date`, `amount`,
`type`, `account`, `status`, `category`). No schema change.

- **Period range**: add a `getPeriodRange(period)` helper returning `{start, end}` Date
  bounds for week / month / last-month / all-time. Generalize the month-bound logic
  currently hard-coded in `getMonthlyCategoryTotals()`, `getMonthlyPendingCategoryTotals()`,
  `getCurrentMonthEntries()` so they accept a range (default = current behavior).
- **Spending trend series**: group `expense` entries within the range by day (or by an
  appropriate bucket for "all time"), summing `amount`; produce points for the SVG path +
  hover hit-areas.
- **Donut by period**: category totals (needs/wants/savings) computed over the selected
  range, honoring the Current/Projected toggle as today.
- **Sparklines**: per tile, a short ordered series of that metric over recent buckets
  (e.g. running balance for cash/bank/savings; per-period spent/pending). Keep cheap.

## Components / boundaries
- `index.html`: add the period selector + a two-column "Analysis" row (trend card + donut
  card); remove the `.budget-split` block; tiles gain a `<svg class="sparkline">` slot.
  Preserve **every element id** in the `app.js` `elements` map.
- `styles.css`: styles for `.analysis` row (2-col, responsive to 1-col), `.trend-chart`
  (fills card), axis/gridline classes, `.sparkline`, tooltip, and the shared period pills
  (reuse `.segmented`/`.mode-toggle` look). Remove now-unused `.budget-split` rules.
- `app.js`: period state + `getPeriodRange()`; range-aware totals; `renderTrendChart()`,
  `renderSparklines()`, donut-slice + trend hover tooltips; wire the period selector to
  re-render analysis. Existing `renderTotals()/render()/renderCharts()` extended, not
  rewritten; balances/history/forms/bulk untouched.

## Non-goals (YAGNI)
- No multi-currency, no date-range custom picker beyond the 4 presets, no chart library,
  no export, no changes to how entries are added or stored.

## Verification
Open `index.html` (data in localStorage):
1. Period selector switches Week/Month/Last month/All time; the trend chart and donut both
   update; balances + history do **not** change with period.
2. Trend chart fills its card, shows ₱ Y-axis gridlines + day X-labels; hovering shows
   date + amount; empty period shows a clean empty state.
3. Donut shows the split for the period; hovering Wants (orange) shows the Wants total;
   Current/Projected toggle still works.
4. Trend + donut are side by side on desktop, stack on narrow widths.
5. Sparkline tiles show a small trend and hover amount; numbers still match balances.
6. Untouched: To Pay Shape, Biggest Charges, history filters/pagination, add-forms, bulk
   actions, reset. Responsive at ~820px and ~560px with no overlap.

## Notes
- Project is not a git repo, so the design doc is saved but not committed.
- Per the user's workflow, the implementation plan (next step) is the hand-off for
  execution.
