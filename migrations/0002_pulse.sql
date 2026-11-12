-- OCEC Pulse application schema.
--
-- Anonymity by construction:
--   * pulse_responses / pulse_answers / pulse_comments carry NO reference to an
--     invitee, token, email, IP address or user agent.
--   * Responses store the submission DATE only (no time of day), and invitees
--     store only a `used` flag (no completion time), so the two tables cannot
--     be joined by timing.
--   * Comments are stored detached from their response, so free text cannot be
--     combined with tenure / level / contract to single a person out.

create table if not exists pulse_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists pulse_staff (
  user_id       text primary key,
  email         text,
  name          text,
  role          text not null,
  department_id text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create table if not exists pulse_staff_invites (
  code          text primary key,
  email         text not null,
  name          text,
  role          text not null,
  department_id text,
  created_by    text not null,
  created_at    timestamptz not null default now(),
  accepted_by   text,
  accepted_at   timestamptz
);

create table if not exists pulse_invitees (
  id             text primary key,
  email          text not null unique,
  department_id  text,
  token          text not null unique,
  used           boolean not null default false,
  opened         boolean not null default false,
  invited_at     timestamptz,
  last_sent_at   timestamptz,
  reminders_sent integer not null default 0,
  send_error     text,
  created_at     timestamptz not null default now()
);
create index if not exists pulse_invitees_used_idx on pulse_invitees (used);

create table if not exists pulse_responses (
  id            text primary key,
  submitted_on  date not null,
  lang          text,
  department_id text,
  tenure        text,
  level         text,
  contract      text,
  source        text not null
);
create index if not exists pulse_responses_dept_idx on pulse_responses (department_id);

create table if not exists pulse_answers (
  response_id text not null references pulse_responses (id) on delete cascade,
  question_id text not null,
  value       smallint not null,
  primary key (response_id, question_id)
);
create index if not exists pulse_answers_question_idx on pulse_answers (question_id);

create table if not exists pulse_comments (
  id            text primary key,
  question_id   text not null,
  department_id text,
  body          text not null,
  submitted_on  date not null
);

create table if not exists pulse_campaigns (
  id          text primary key,
  name        text not null,
  kind        text not null,
  audience    text not null,
  subject_en  text,
  subject_ar  text,
  body_en     text,
  body_ar     text,
  recipients  integer not null default 0,
  sent        integer not null default 0,
  failed      integer not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists pulse_audit (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  actor     text not null,
  action_en text not null,
  action_ar text not null
);
