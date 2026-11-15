-- "I'm not a robot" check on sign-in, account creation and password reset (self-hosted ALTCHA).
-- Each solved check can be used a few times for 10 minutes; this table counts the uses. It holds only
-- a hash of the check, nothing about the person, and rows are deleted once they expire.
create table if not exists pulse_captcha_used (
  sig        text primary key,
  uses       integer not null default 1,
  expires_at timestamptz not null
);
