# Goal OS Full-Stack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the migration of Goal OS and Budget Tracker into one tested React application backed by an Express/SQLite API, while retaining an explicit path to Supabase.

**Architecture:** A repository-backed Express service owns validation, calculations, and atomic writes. React uses feature-focused API modules and views; it never treats localStorage as authoritative after one-time legacy import. SQLite remains local storage, with portable UUID/user/date/money conventions for later PostgreSQL migration.

**Tech Stack:** React 19, Vite, Express 5, Node test runner, `node:sqlite`, React Testing Library, Recharts, CSS.

---

## File Structure

- `server/src/database.js`: database creation, migrations, and transaction helpers.
- `server/src/repositories/*.js`: SQL persistence grouped by profile, activity, and finance.
- `server/src/services/*.js`: Goal OS and budget business rules.
- `server/src/routes/*.js`: HTTP request validation and response mapping.
- `server/src/app.js`: testable Express application factory.
- `server/src/index.js`: process entrypoint only.
- `server/test/*.test.js`: isolated API/service tests using temporary databases.
- `client/src/api/client.js`: fetch wrapper and error mapping.
- `client/src/features/*`: feature-specific components, calculations, and tests.
- `client/src/components/*`: shared shell and compact UI primitives.
- `client/src/App.jsx`: route/view composition only.
- `client/src/App.css`: application layout and responsive styling.
- `client/src/test/*`: browser-independent test setup and fixtures.

### Task 1: Testable Database and API Foundation

**Files:**
- Create: `server/src/database.js`
- Create: `server/src/app.js`
- Create: `server/src/domain.js`
- Create: `server/test/database.test.js`
- Create: `server/test/health.test.js`
- Modify: `server/src/index.js`
- Modify: `server/package.json`

- [ ] **Step 1: Add Node test scripts and write failing database/API tests**

Test that a temporary database creates `users`, `profiles`, `habits`,
`habit_completions`, `goals`, `goal_progress_events`, `evidence_entries`,
`xp_events`, and `transactions`; verify `/api/health` returns `{ok:true}`.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test --prefix server`
Expected: FAIL because the database factory and app factory do not exist.

- [ ] **Step 3: Implement migrations and app factory**

Use `createDatabase({ filename })` and `createApp({ db })`. Seed one stable
local user ID and profile. Store UUIDs as text, money as integer centavos,
dates as `YYYY-MM-DD`, and timestamps as UTC ISO strings.

- [ ] **Step 4: Run tests and confirm success**

Run: `npm test --prefix server`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add server && git commit -m "Build testable Goal OS data foundation"`

### Task 2: Core Goal OS Domain and API

**Files:**
- Create: `server/src/repositories/activityRepository.js`
- Create: `server/src/services/activityService.js`
- Create: `server/src/routes/activityRoutes.js`
- Create: `server/test/activity.test.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Write failing tests for identity, habits, goals, XP, evidence, streaks, and weekly rollover**

Cover profile updates; habit create/update/delete; bounded daily completion;
atomic completion + XP + evidence; Monday-based streaks; ongoing and weekly
goals; goal completion bonus awarded once; dashboard and analytics summaries.

- [ ] **Step 2: Run targeted tests and confirm failure**

Run: `node --test server/test/activity.test.js`
Expected: FAIL because activity services/routes are missing.

- [ ] **Step 3: Implement repositories, service transactions, and routes**

Expose the endpoints listed in the design spec. Validate names, targets, XP,
cues, cadence, and ownership. Derive XP from `xp_events`; derive streaks and
analytics from completion history.

- [ ] **Step 4: Run all server tests**

Run: `npm test --prefix server`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add server && git commit -m "Migrate complete Goal OS backend"`

### Task 3: Budget Ledger Domain and API

**Files:**
- Create: `server/src/repositories/financeRepository.js`
- Create: `server/src/services/financeService.js`
- Create: `server/src/routes/financeRoutes.js`
- Create: `server/test/finance.test.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Write failing ledger tests**

Cover income; paid and to-pay expenses; cash/bank/savings balances; saving
transfers; insufficient funds; paid/to-pay transitions; deletion reversal;
bulk status/category/delete actions; filters; pagination; 50/30/20 summaries;
period analytics and largest charges.

- [ ] **Step 2: Run targeted tests and confirm failure**

Run: `node --test server/test/finance.test.js`
Expected: FAIL because finance services/routes are missing.

- [ ] **Step 3: Implement finance persistence and calculations**

Keep transactions immutable except supported status/category changes. Recompute
balances from the ledger. Use centavos in storage and API; reject overdrafts in
one database transaction.

- [ ] **Step 4: Run all server tests**

Run: `npm test --prefix server`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add server && git commit -m "Migrate budget ledger backend"`

### Task 4: React Test Harness and Application Shell

**Files:**
- Create: `client/src/api/client.js`
- Create: `client/src/components/AppShell.jsx`
- Create: `client/src/components/AppShell.test.jsx`
- Create: `client/src/test/setup.js`
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.css`
- Modify: `client/package.json`

- [ ] **Step 1: Install test/UI dependencies and write failing shell tests**

Install Vitest, jsdom, React Testing Library, user-event, and Recharts. Test
navigation for Dashboard, Habits, Goals, Budget, Analytics, and Identity plus
loading/error states.

- [ ] **Step 2: Run client tests and confirm failure**

Run: `npm test --prefix client`
Expected: FAIL before the shell/API modules exist.

- [ ] **Step 3: Implement compact responsive shell**

Use the approved restrained green visual language. Desktop uses a narrow
sidebar; mobile uses a compact top navigation. Preserve usable content widths,
no nested decorative cards, and no horizontal overflow.

- [ ] **Step 4: Run tests, lint, and build**

Run:
`npm test --prefix client && npm run lint --prefix client && npm run build --prefix client`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add client && git commit -m "Build unified Goal OS React shell"`

### Task 5: Core Goal OS React Features

**Files:**
- Create: `client/src/features/dashboard/DashboardView.jsx`
- Create: `client/src/features/habits/HabitsView.jsx`
- Create: `client/src/features/goals/GoalsView.jsx`
- Create: `client/src/features/identity/IdentityView.jsx`
- Create: `client/src/features/activity/activity.test.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.css`

- [ ] **Step 1: Write failing user-flow tests**

Test identity editing; habit create/complete/details/delete; time-cue columns;
goal create/progress/delete; evidence rendering; XP/milestones; productive
percentage; weekly labels; validation errors.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test --prefix client -- activity.test.jsx`
Expected: FAIL because views are missing.

- [ ] **Step 3: Implement Core Goal OS views**

Connect all interactions to the API. Keep habit columns independently
scrollable, progress metadata behind compact detail controls, and the dashboard
first for confirmed profiles.

- [ ] **Step 4: Run client verification**

Run:
`npm test --prefix client && npm run lint --prefix client && npm run build --prefix client`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add client && git commit -m "Complete Goal OS React features"`

### Task 6: Budget Tracker React Features

**Files:**
- Create: `client/src/features/budget/BudgetView.jsx`
- Create: `client/src/features/budget/TransactionForm.jsx`
- Create: `client/src/features/budget/TransactionHistory.jsx`
- Create: `client/src/features/budget/BudgetCharts.jsx`
- Create: `client/src/features/budget/budget.test.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.css`

- [ ] **Step 1: Write failing budget workflow tests**

Test add income/expense/saving; paid/to-pay; payment account choice; selection
toolbar; bulk delete/status/category; filter-only visibility; date filtering;
ten-row pagination; current/projected charts; totals.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test --prefix client -- budget.test.jsx`
Expected: FAIL because budget views are missing.

- [ ] **Step 3: Implement the complete Budget view**

Use a compact summary strip, analysis panel, segmented entry form, filter
toolbar, paginated history, and sticky selection action bar. Recharts renders
the donut and trend; accessible text totals remain visible.

- [ ] **Step 4: Run client verification**

Run:
`npm test --prefix client && npm run lint --prefix client && npm run build --prefix client`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add client && git commit -m "Complete budget tracker React migration"`

### Task 7: Unified Analytics and Legacy Import

**Files:**
- Create: `client/src/features/analytics/AnalyticsView.jsx`
- Create: `client/src/features/import/LegacyImport.jsx`
- Create: `server/src/routes/importRoutes.js`
- Create: `server/src/services/importService.js`
- Create: `server/test/import.test.js`
- Create: `client/src/features/import/LegacyImport.test.jsx`
- Modify: `server/src/app.js`
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Write failing import and analytics tests**

Test normalization of `goal-os-identity` and `simple-budget-tracker`
localStorage payloads, idempotent one-time import, invalid payload rejection,
and combined activity/finance analytics rendering.

- [ ] **Step 2: Run tests and confirm failure**

Run:
`npm test --prefix server && npm test --prefix client`
Expected: FAIL because import and unified analytics are missing.

- [ ] **Step 3: Implement import and analytics**

Offer import only when legacy keys exist and the database has no meaningful
user data. Require explicit confirmation. Convert monetary values to centavos,
preserve dates/categories/statuses, and mark import completion.

- [ ] **Step 4: Run all automated checks**

Run:
`npm test --prefix server && npm test --prefix client && npm run lint --prefix client && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
`git add server client && git commit -m "Add unified analytics and legacy import"`

### Task 8: Browser Parity, Documentation, and Release Checkpoint

**Files:**
- Create: `docs/migration-parity-checklist.md`
- Create: `server/sql/supabase-schema.sql`
- Modify: `README.md`
- Modify: `RESUME.md`

- [ ] **Step 1: Document Supabase-ready schema and local operation**

Provide setup commands, architecture, environment variables, database backup,
and later Supabase migration steps. The SQL schema includes UUID user ownership,
foreign keys, indexes, and RLS policy templates.

- [ ] **Step 2: Run browser parity workflows**

At desktop and phone widths verify identity, habit, goal, evidence, budget
entry, pending-payment conversion, bulk actions, filters, pagination, charts,
and reset/import behavior. Confirm no horizontal overflow and inspect console
errors.

- [ ] **Step 3: Run final completion audit**

Run:
`npm test --prefix server && npm test --prefix client && npm run lint --prefix client && npm run build && git diff --check`
Expected: all commands PASS and the parity checklist has evidence for every
design requirement.

- [ ] **Step 4: Commit and push**

Run:
`git add . && git commit -m "Finish Goal OS full-stack migration" && git push origin main`

