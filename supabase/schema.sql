-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)

create table if not exists codes (
  id          bigint generated always as identity primary key,
  code        text unique not null,          -- the 10-digit code
  is_used     boolean not null default false,
  used_by_name  text,
  used_by_phone text
);

create index if not exists idx_codes_code on codes (code);

-- Row Level Security: keep the table locked down. The Next.js API route
-- talks to Supabase with the service_role key (server-side only), which
-- bypasses RLS, so the table stays private from the public anon key.
alter table codes enable row level security;
