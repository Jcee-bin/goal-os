# Goal OS

Goal OS is a local-first personal operating system that combines identity-based
habits, action goals, XP/evidence, analytics, a focus timer, and a complete
budget ledger.

## Run Locally

Requirements: Node.js 24 or newer.

```powershell
npm install
npm install --prefix client
npm install --prefix server
npm run dev
```

The React app normally opens at `http://localhost:5173`. If that port is busy,
Vite chooses the next available port. The API runs at `http://localhost:8787`.

## Commands

```powershell
npm run dev
npm run build
npm test --prefix server
npm test --prefix client
npm run lint --prefix client
```

## Architecture

- `client/`: React/Vite application.
- `server/`: Express API and SQLite repositories/services.
- `server/data/goal-os.sqlite`: local data, intentionally ignored by Git.
- `goal-os.html` and `index.html`: retained vanilla applications for migration
  reference and legacy export.

The server owns validation, XP awards, evidence, weekly rollover, balances,
bulk financial actions, and analytics. The browser stores only temporary UI
state plus the focus timer's local countdown preferences.

## Legacy Data

1. Open the original `goal-os.html`.
2. Press **Export Data** in the sidebar.
3. Open the React Goal OS.
4. Press **Import** in the import banner and select
   `goal-os-legacy-export.json`.

Import is intentionally allowed once. It replaces starter content and preserves
habits, completions, goals, XP, evidence, and budget transactions.

## Local Backup

Stop the API before copying the database:

```powershell
Copy-Item server\data\goal-os.sqlite server\data\goal-os-backup.sqlite
```

To restore, stop the API and replace `goal-os.sqlite` with the backup.

## Supabase Migration

The future cloud schema is in
`server/sql/supabase-schema.sql`. The tables already use UUID-compatible IDs,
`user_id` ownership, ISO dates/timestamps, and integer centavos.

Cloud migration steps:

1. Create a Supabase project.
2. Run `server/sql/supabase-schema.sql` in the SQL editor.
3. Add Supabase Auth to the React client.
4. Replace the SQLite repositories with PostgreSQL/Supabase repositories.
5. Import the local database under the authenticated user ID.
6. Keep service-role credentials on the server only.

The application remains local until this phase is explicitly implemented.
