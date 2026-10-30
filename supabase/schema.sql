create extension if not exists "uuid-ossp";

create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text not null,
  persona text not null default 'Student / Job Seeker',
  organization text,
  scans_completed integer not null default 0,
  traps_detected integer not null default 0,
  estimated_savings_inr integer not null default 0,
  feedback_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_audits (
  id uuid primary key default uuid_generate_v4(),
  user_email text,
  user_name text,
  document_title text not null,
  category text not null,
  raw_excerpt text not null,
  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  risk_verdict text not null,
  executive_summary text not null,
  hinglish_summary text not null,
  estimated_financial_exposure text not null,
  clauses jsonb not null default '[]'::jsonb,
  missing_protections jsonb not null default '[]'::jsonb,
  negotiation_scripts jsonb not null default '{}'::jsonb,
  key_metrics jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_comparisons (
  id uuid primary key default uuid_generate_v4(),
  user_email text,
  comparison_title text not null,
  doc_a_title text not null,
  doc_b_title text not null,
  winner text not null,
  verdict_summary text not null,
  hinglish_verdict text not null,
  comparison_rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_audits_created_at on public.contract_audits(created_at desc);
create index if not exists idx_contract_audits_user_email on public.contract_audits(user_email);
create index if not exists idx_user_profiles_created_at on public.user_profiles(created_at desc);

alter table public.user_profiles enable row level security;
alter table public.contract_audits enable row level security;
alter table public.contract_comparisons enable row level security;

create policy "Allow public read of user_profiles"
  on public.user_profiles for select using (true);

create policy "Allow public insert/update of user_profiles"
  on public.user_profiles for all using (true) with check (true);

create policy "Allow public read of contract_audits"
  on public.contract_audits for select using (true);

create policy "Allow public insert of contract_audits"
  on public.contract_audits for insert with check (true);

create policy "Allow public read/insert of contract_comparisons"
  on public.contract_comparisons for all using (true) with check (true);
