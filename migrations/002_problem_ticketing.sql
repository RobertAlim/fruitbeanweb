-- ═══════════════════════════════════════════════════════════════
-- 002_problem_ticketing.sql
-- Adds problem-ticket tracking + resolution workflow to rentals.
--
-- New status flow:
--   Pending -> Active -> Problem -> Resolved -> Active (client confirms)
--                              \-> Ended (admin can end at any point)
--
-- Run this once against your Fruitbean_DB before using the new
-- ticketing feature:
--   psql "postgresql://postgres:WEBSITE123@localhost:5432/Fruitbean_DB" -f migrations/002_problem_ticketing.sql
-- ═══════════════════════════════════════════════════════════════

-- 1) New columns on rentals to hold the problem report + resolution info
ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS problem_types     jsonb,
  ADD COLUMN IF NOT EXISTS urgency           text,
  ADD COLUMN IF NOT EXISTS problem_notes     text,
  ADD COLUMN IF NOT EXISTS reported_at       timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_method text,
  ADD COLUMN IF NOT EXISTS technician        text,
  ADD COLUMN IF NOT EXISTS resolved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz;

-- 2) Widen the status CHECK constraint to allow 'Resolved'
--    (finds whatever the existing constraint on `status` is named
--    and replaces it, so this works regardless of how it was created)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'rentals'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE rentals DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE rentals
  ADD CONSTRAINT rentals_status_check
  CHECK (status IN ('Pending', 'Active', 'Problem', 'Resolved', 'Ended'));

-- 3) Constrain resolution_method to the two supported paths
ALTER TABLE rentals
  DROP CONSTRAINT IF EXISTS rentals_resolution_method_check;

ALTER TABLE rentals
  ADD CONSTRAINT rentals_resolution_method_check
  CHECK (resolution_method IS NULL OR resolution_method IN ('technician', 'anydesk'));

-- 4) Constrain technician to the known roster (nullable — only set when resolution_method = 'technician')
ALTER TABLE rentals
  DROP CONSTRAINT IF EXISTS rentals_technician_check;

ALTER TABLE rentals
  ADD CONSTRAINT rentals_technician_check
  CHECK (technician IS NULL OR technician IN ('Arjay', 'Em Jay', 'OJT Gang', 'Leyah', 'Alim'));
