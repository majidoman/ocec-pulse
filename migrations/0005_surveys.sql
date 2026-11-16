-- Several surveys. Each survey has its own questions, dates, look, invitation list, answers and comments.
-- The first survey keeps id 'main' and its settings stay where they were (pulse_settings 'config');
-- every other survey keeps its own part of the settings in pulse_surveys.config.
create table if not exists pulse_surveys (
  id         text primary key,
  config     jsonb,
  is_demo    boolean not null default false,
  created_at timestamptz not null default now()
);
insert into pulse_surveys (id) values ('main') on conflict (id) do nothing;

alter table pulse_invitees  add column if not exists survey_id text not null default 'main';
alter table pulse_responses add column if not exists survey_id text not null default 'main';
alter table pulse_comments  add column if not exists survey_id text not null default 'main';
alter table pulse_campaigns add column if not exists survey_id text not null default 'main';
create index if not exists pulse_invitees_survey_idx  on pulse_invitees (survey_id);
create index if not exists pulse_responses_survey_idx on pulse_responses (survey_id);
create index if not exists pulse_comments_survey_idx  on pulse_comments (survey_id);
create index if not exists pulse_campaigns_survey_idx on pulse_campaigns (survey_id);

-- The same person can be invited to more than one survey.
alter table pulse_invitees drop constraint if exists pulse_invitees_email_key;
create unique index if not exists pulse_invitees_survey_email_idx on pulse_invitees (survey_id, email);
