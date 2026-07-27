-- Migration: add contract fields to rentals
-- Generated: 2026-07-23

BEGIN;

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS contract_start      date,
  ADD COLUMN IF NOT EXISTS contract_end        date,
  ADD COLUMN IF NOT EXISTS contract_status     character varying(20)
    CONSTRAINT rentals_contract_status_check
      CHECK (contract_status IS NULL OR contract_status = ANY (
        ARRAY['Active'::character varying, 'Expiring'::character varying, 'Expired'::character varying]
      )),
  ADD COLUMN IF NOT EXISTS last_notified_at    timestamp without time zone;

COMMIT;
