create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  identity text not null,
  arena text not null default '',
  identity_confirmed boolean not null default false,
  legacy_imported boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  xp integer not null check (xp between 1 and 100),
  target_per_day integer not null default 1 check (target_per_day between 1 and 20),
  cue text not null default 'anytime' check (cue in ('morning','afternoon','night','anytime')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index habits_user_idx on public.habits(user_id, active, created_at);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now()
);
create index completions_habit_date_idx
  on public.habit_completions(user_id, habit_id, completed_on);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target integer not null check (target > 0),
  current integer not null default 0 check (current >= 0),
  unit text not null default 'times',
  cadence text not null default 'ongoing' check (cadence in ('ongoing','weekly')),
  week_key date,
  completion_awarded boolean not null default false,
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals(user_id, created_at);

create table public.goal_progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount integer not null check (amount > 0),
  event_on date not null,
  created_at timestamptz not null default now()
);

create table public.evidence_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  description text not null,
  xp_delta integer not null default 0,
  event_on date not null,
  created_at timestamptz not null default now()
);
create index evidence_user_date_idx
  on public.evidence_entries(user_id, event_on, created_at);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  amount integer not null,
  event_on date not null,
  created_at timestamptz not null default now()
);
create index xp_user_date_idx on public.xp_events(user_id, event_on, created_at);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','saving')),
  account text not null check (account in ('cash','bank','savings')),
  destination_account text check (destination_account in ('cash','bank','savings')),
  status text not null default 'paid' check (status in ('paid','to-pay')),
  category text not null check (category in ('income','needs','wants','debt','saving')),
  amount_centavos bigint not null check (amount_centavos > 0),
  note text not null default '',
  transaction_on date not null,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx
  on public.transactions(user_id, transaction_on, created_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text not null default '',
  area text not null default 'personal'
    check (area in ('personal','school','business','health')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  scheduled_on date,
  start_time time,
  end_time time,
  status text not null default 'open' check (status in ('open','completed')),
  calendar_enabled boolean not null default false,
  calendar_event_id text,
  sync_status text not null default 'local'
    check (sync_status in ('local','pending','synced','failed')),
  sync_error text,
  completed_on date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_schedule_idx
  on public.tasks(user_id, status, scheduled_on, start_time, created_at);

create table public.google_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text,
  calendar_id text,
  connected_at timestamptz,
  last_polled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.google_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table public.calendar_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  operation text not null check (operation in ('delete')),
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_progress_events enable row level security;
alter table public.evidence_entries enable row level security;
alter table public.xp_events enable row level security;
alter table public.transactions enable row level security;
alter table public.tasks enable row level security;
alter table public.google_integrations enable row level security;
alter table public.google_oauth_states enable row level security;
alter table public.calendar_outbox enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'habits', 'habit_completions', 'goals',
    'goal_progress_events', 'evidence_entries', 'xp_events', 'transactions',
    'tasks'
  ]
  loop
    execute format(
      'create policy "Users manage their own %1$s" on public.%1$I
       for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name
    );
  end loop;
end $$;
