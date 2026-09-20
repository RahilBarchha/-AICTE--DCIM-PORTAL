-- ============================================================================
-- AICTE DCIM / Cybersecurity Portal — Supabase SQL Schema (Hardened Production)
-- Run this script in your Supabase SQL Editor:
-- (Supabase Dashboard -> Project -> SQL Editor -> New query -> Paste -> Run)
-- ============================================================================

-- 1. Users Table (Authentication & RBAC)
create table if not exists public.users (
  id          bigint generated always as identity primary key,
  username    text unique not null,
  name        text not null,
  email       text,
  role        text not null default 'Viewer',
  status      text not null default 'Active',
  created_at  timestamptz not null default now()
);

-- 2. Servers Table (Infrastructure Inventory & Status)
create table if not exists public.servers (
  id          bigint primary key,
  name        text not null,
  ip          text not null,
  status      text not null default 'Online',
  os          text,
  cpu         numeric default 0,
  ram         numeric default 0,
  disk        numeric default 0,
  temp        numeric default 38,
  rack        text default 'Rack-A01',
  iops        bigint default 800,
  uptime      text default '99.99%',
  max_cpu     text default '32 Cores',
  max_ram     text default '128 GB',
  is_vm       boolean default false,
  updated_at  timestamptz not null default now()
);

-- 3. Live Server Metrics & Telemetry History (Time-Series)
create table if not exists public.server_metrics (
  id          bigint generated always as identity primary key,
  server_id   bigint not null,
  server_name text not null,
  ip          text,
  cpu         numeric not null default 0 check (cpu >= 0 and cpu <= 100),
  ram         numeric not null default 0 check (ram >= 0 and ram <= 100),
  disk        numeric default 0 check (disk >= 0 and disk <= 100),
  temp        numeric default 38,
  iops        bigint default 0,
  simulation  text default 'normal',
  recorded_at timestamptz not null default now()
);

-- 4. Incident Alerts Table (Auto-Resolving Watchdog)
create table if not exists public.alerts (
  id          bigint primary key,
  severity    text not null default 'Warning',
  source      text not null,
  message     text not null,
  status      text not null default 'Open',
  server_id   bigint,
  metric      text,
  peak_value  numeric,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- 5. Audit Trail & Log History Table (Append-Only Cryptographic Log)
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  username    text not null,
  role        text not null,
  action      text not null,
  target      text not null,
  ip          text default '127.0.0.1',
  result      text default 'Success',
  hash        text,
  prev_hash   text,
  details     text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) Configuration — Hardened Access Policies
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.servers enable row level security;
alter table public.server_metrics enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;

-- 1. Users Policies:
-- Read permitted for authenticated users; mutations restricted to service_role or admin
create policy "users_select_authenticated" on public.users
  for select to authenticated using (true);

create policy "users_admin_insert" on public.users
  for insert to authenticated with check (
    auth.jwt() ->> 'role' in ('Super Admin', 'Admin') or auth.jwt() ->> 'role' = 'service_role'
  );

create policy "users_admin_update" on public.users
  for update to authenticated using (
    auth.jwt() ->> 'role' in ('Super Admin', 'Admin') or auth.jwt() ->> 'role' = 'service_role'
  );

-- 2. Servers Policies:
-- All authenticated operators can view; updates restricted to authorized ops roles
create policy "servers_select_authenticated" on public.servers
  for select to authenticated using (true);

create policy "servers_ops_mutate" on public.servers
  for all to authenticated using (
    auth.jwt() ->> 'role' in ('Super Admin', 'Admin', 'IT Operator') or auth.jwt() ->> 'role' = 'service_role'
  );

-- 3. Server Metrics Policies:
-- Read for authenticated; Write for authenticated ingestion services
create policy "metrics_select_authenticated" on public.server_metrics
  for select to authenticated using (true);

create policy "metrics_insert_telemetry" on public.server_metrics
  for insert to authenticated with check (true);

-- 4. Alerts Policies:
create policy "alerts_select_authenticated" on public.alerts
  for select to authenticated using (true);

create policy "alerts_ops_mutate" on public.alerts
  for all to authenticated using (
    auth.jwt() ->> 'role' in ('Super Admin', 'Admin', 'IT Operator') or auth.jwt() ->> 'role' = 'service_role'
  );

-- 5. Audit Logs Policies (Strict Append-Only: No Update, No Delete):
create policy "audit_select_authenticated" on public.audit_logs
  for select to authenticated using (true);

create policy "audit_insert_append_only" on public.audit_logs
  for insert to authenticated with check (true);

-- Explicitly revoke DELETE and UPDATE privileges on audit_logs from anon & authenticated roles to ensure immutability
revoke update, delete on public.audit_logs from anon, authenticated;
