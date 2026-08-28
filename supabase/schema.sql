create table if not exists codes (
  id          bigint generated always as identity primary key,
  code        text unique not null,          -- the 10-digit code
  is_used     boolean not null default false,
  used_by_name  text,
  used_by_phone text
);

create index if not exists idx_codes_code on codes (code);

alter table codes enable row level security;
