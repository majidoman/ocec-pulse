-- "Undo" in Change history: a settings change keeps a copy of the settings as they were just before it.
alter table pulse_audit add column if not exists snapshot jsonb;
alter table pulse_audit add column if not exists survey_id text;
