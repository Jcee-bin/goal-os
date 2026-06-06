# Goal OS Full-Stack Migration Design

Date: 2026-06-06
Status: Approved design, pending written-spec review

## Objective

Convert the existing Goal OS and Budget Tracker from separate vanilla
HTML/CSS/JavaScript applications into one React application backed by an
Express API and SQLite database. Preserve the behavior users already rely on,
then move the same data model to Supabase PostgreSQL after local feature parity
is reached.

The original files remain available as behavioral references until the React
version passes feature-parity verification.

## Delivery Strategy

Migration happens in complete vertical slices. Each slice includes its database
tables, backend rules, API endpoints, React interface, and automated tests.
Screens must not write authoritative application data directly to localStorage.

Order:

1. Core Goal OS
2. Budget Tracker
3. Unified dashboard and analytics
4. Supabase, authentication, and multi-device synchronization
5. Gemini/JARVIS integrations

The first implementation plan covers Core Goal OS only. Budget and cloud work
receive separate plans after the preceding slice is verified.

## Architecture

### React Client

The React client owns presentation and temporary interface state:

- Active navigation view
- Open dialogs and expanded rows
- Form input before submission
- Filters, pagination, and chart display modes

It reads and changes persistent data through the API. It may cache harmless
preferences locally, but habits, goals, XP, evidence, and finances come from
the backend.

### Express API

The API owns application behavior:

- Input validation
- Daily completion limits
- XP awards
- Evidence creation
- Weekly goal rollover
- Financial balance and category calculations
- Multi-record operations and consistency

Operations that affect multiple records run in one database transaction. For
example, completing a habit writes the completion, awards XP, and creates
evidence together.

### Database

SQLite is the local development database. Tables and repository boundaries are
kept compatible with a later PostgreSQL implementation. Application services
do not depend on browser storage or SQLite-specific response shapes.

The migration to Supabase replaces the repository implementation, not the
React feature behavior.

## Core Goal OS Scope

### Identity

The user can:

- View and edit the identity statement
- Set an optional focus arena
- Confirm identity setup
- See current XP, level, and milestone progress

Identity setup lives below the main dashboard after confirmation. The dashboard
is the default view for a returning user.

### Habits

Each habit contains:

- Name
- XP per completed repetition
- Daily target
- Time cue: morning, afternoon, night, or anytime
- Active state
- Creation timestamp

The user can create, complete, inspect, and delete habits. The interface groups
active habits by time cue and keeps long groups scrollable.

A completion:

- Is recorded for a local calendar date
- Cannot exceed the habit's target for that date
- Awards XP once per accepted repetition
- Creates one evidence entry

Daily reset is derived from the date. Completion history is retained rather
than deleted at midnight.

### Action Goals

Each goal contains:

- Name
- Numeric target and current progress
- Unit
- Cadence: ongoing or weekly
- Week key for weekly goals
- Creation timestamp

The user can create, increment, and delete goals. Weekly goals reset their
current progress when the current Monday-based week differs from their stored
week key. Previous progress remains available through events/evidence rather
than being treated as the current week's value.

Progressing a goal creates evidence and awards the configured progress XP.
Crossing the target awards completion XP only once.

### Evidence and XP

Evidence entries record:

- Source type and source record ID
- Human-readable description
- XP delta
- Event date and timestamp

XP is stored as an append-only ledger of awards. The displayed total is derived
from that ledger, avoiding mismatches between evidence and a separately mutated
counter. Reset operations create an explicit reset boundary or delete the
selected user's local data transactionally.

The dashboard shows recent evidence, today's XP, total XP, level, and next
milestone.

### Analytics

Core analytics derive from completion and evidence history:

- Productive percentage for today
- Habits completed versus scheduled
- Current streak per habit
- Best current streak
- XP earned today
- Weekly habit completion trend
- Goal progress

No separate analytics totals are stored.

## Budget Tracker Scope

The second implementation slice migrates all current budget behavior.

### Ledger

Transactions contain:

- Type: income, expense, or saving transfer
- Account: cash, bank, or savings
- Status: paid or to-pay where applicable
- Category: income, needs, wants, debt, or saving
- Amount stored as integer centavos
- Note
- Transaction date and creation timestamp

Balances are always derived from the transaction ledger:

- Income increases its account
- Paid expenses decrease their selected account
- To-pay expenses do not reduce an account until marked paid
- Saving transfers move money from cash/bank into savings

Deleting a transaction reverses its ledger effect naturally because balances
are recalculated from the remaining records.

### Budget Workflows

The React interface preserves:

- Add money, expense, and saving forms
- Paid and to-pay expenses
- Choosing the payment account when marking to-pay as paid
- Bulk select, delete, mark paid, mark to-pay, and categorize
- Needs/wants/debt/saving labels
- Date and status/category filters
- Ten history entries per page
- Current and projected 50/30/20 modes
- Account totals, total spent, pending total, and total tracked
- Spending trend, donut, sparklines, and largest charges

Bulk operations run transactionally.

## Unified Dashboard

After both slices are complete, the dashboard combines:

- Identity, XP, and milestone progress
- Today's habits and action goals
- Evidence summary
- Productivity analytics
- Cash, bank, savings, paid spending, and to-pay totals
- A compact financial chart
- Links to detailed Habits, Goals, Analytics, and Budget views

The dashboard remains a working surface, not a marketing page. Detailed forms
and long histories stay in their dedicated views.

## Data Model

Initial tables:

- `profiles`
- `habits`
- `habit_completions`
- `goals`
- `goal_progress_events`
- `evidence_entries`
- `xp_events`
- `transactions`

All user-owned tables include a `user_id` field now, even while the local app
uses one seeded local user. This makes the later Supabase/Auth migration
explicit and prevents a destructive schema redesign.

IDs are UUID strings. Dates use `YYYY-MM-DD`; timestamps use UTC ISO values.
Monetary amounts use integer centavos.

## API Shape

Core endpoints:

- `GET /api/dashboard`
- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/habits`
- `POST /api/habits`
- `PATCH /api/habits/:id`
- `DELETE /api/habits/:id`
- `POST /api/habits/:id/completions`
- `GET /api/goals`
- `POST /api/goals`
- `PATCH /api/goals/:id`
- `DELETE /api/goals/:id`
- `POST /api/goals/:id/progress`
- `GET /api/evidence`
- `GET /api/analytics`

Budget endpoints are added in the second slice:

- `GET /api/budget/summary`
- `GET /api/transactions`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/transactions/bulk`
- `GET /api/budget/analytics`

Successful mutation responses return the changed resource plus any affected
summary values. Validation errors use HTTP 400 with field-level details.
Missing records use 404. Conflicting or already-complete actions use 409.

## Validation and Error Handling

Server validation is authoritative:

- Names must be non-empty and length-limited
- Targets and XP must be positive bounded integers
- Cues, cadence, accounts, statuses, and categories use explicit enums
- Money must be positive and converted to centavos
- Paid expenses and saving transfers cannot overdraw their source account
- IDs must exist and belong to the active user

The client displays inline form errors and preserves entered values after a
rejected request. Failed optimistic updates are rolled back or avoided.

## Testing

### Backend

Use Node's test runner with an isolated temporary SQLite database. Cover:

- Daily completion limits
- Atomic XP and evidence creation
- Streak and local-date calculations
- Weekly goal rollover
- Goal completion XP awarded once
- Ledger-derived balances
- To-pay to paid transitions
- Insufficient-funds rejection
- Transaction deletion and bulk operations

### Frontend

Use React Testing Library for forms, loading, empty, error, and interaction
states. Use browser verification for desktop and phone layouts and critical
cross-screen workflows.

### Feature-Parity Checks

Before retiring vanilla screens, compare seeded scenarios between old and new
implementations:

- Identical habit/goal outcomes
- Identical XP and evidence totals
- Identical account balances
- Identical paid, pending, and category totals
- Equivalent filtering and pagination

## Supabase Phase

After local feature parity:

- Create a Supabase PostgreSQL project
- Apply versioned SQL migrations
- Add Supabase Auth
- Enforce `user_id = auth.uid()` with Row Level Security
- Import the local user's data
- Replace the SQLite repositories with PostgreSQL repositories
- Deploy the React client and API

Service-role credentials never enter the client bundle. Free-tier projects
require a documented manual backup routine until paid automated backups are
enabled.

## Non-Goals for the Current Slice

- Supabase connection or login
- Telegram or voice input
- Gemini/JARVIS commands
- Calendar integrations
- Multi-user sharing
- Native mobile packaging
- Deleting the vanilla applications

## Completion Criteria

The Core Goal OS slice is complete when:

1. Identity, habits, goals, evidence, XP, streaks, weekly resets, and core
   analytics work through React and the API.
2. The browser does not use localStorage as authoritative storage for those
   features.
3. Automated backend and frontend tests pass.
4. Desktop and phone browser checks show no overlap or horizontal overflow.
5. Existing local data has an explicit import path or the user confirms it may
   be discarded.
6. The vanilla Goal OS remains available until parity is accepted.
