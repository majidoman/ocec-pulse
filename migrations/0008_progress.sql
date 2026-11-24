-- Anonymous drop-off counts: how many browsers reached each survey page.
-- One counter per survey and page. No person, link, address, device or time is stored,
-- so the counts cannot be linked to anyone or to any answer.
create table if not exists pulse_progress (
  survey_id text not null default 'main',
  step text not null,
  n integer not null default 0,
  primary key (survey_id, step)
);
