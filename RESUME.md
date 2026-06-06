# Current Goal OS Status

The Goal OS and Budget Tracker migration is implemented in `client/` and
`server/`.

- React application: dashboard, habits, goals, identity, budget, analytics,
  focus timer, and legacy import.
- Express/SQLite backend: activity, XP/evidence, finance ledger, import.
- Tests: `npm test --prefix server` and `npm test --prefix client`.
- Development: `npm run dev`.
- Local database: `server/data/goal-os.sqlite`.
- Legacy export: open `goal-os.html` and press **Export Data**.
- Supabase schema: `server/sql/supabase-schema.sql`.

See `README.md` and `docs/migration-parity-checklist.md` for operation and
verification details.
