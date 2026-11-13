-- Abuse protection for the public survey endpoints.
-- A bucket is a one-way hash of (kind, network address, hour); the address itself is never stored,
-- and nothing here is linked to a response or an invitation. Rows older than a few hours are deleted.
create table if not exists pulse_ratelimit (
  bucket text not null,
  hour   timestamptz not null,
  n      integer not null default 0,
  primary key (bucket, hour)
);
