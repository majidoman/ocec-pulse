-- Files employees attach to a "file upload" question. Like comments, a file is kept apart from the
-- person's other answers (no link to the response), tagged only with survey, question and department.
-- A file stays "pending" until the survey is sent; pending files are removed after a day.
create table if not exists pulse_attachments (
  id            text primary key,
  survey_id     text not null default 'main',
  question_id   text not null,
  upload_key    text not null,
  filename      text not null,
  mime          text not null,
  size          integer not null,
  data          bytea not null,
  department_id text,
  submitted     boolean not null default false,
  submitted_on  date,
  created_at    timestamptz not null default now()
);
create index if not exists pulse_attachments_survey_idx on pulse_attachments (survey_id, submitted, question_id);
create index if not exists pulse_attachments_pending_idx on pulse_attachments (created_at) where submitted = false;
