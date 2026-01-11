-- Add transfer_hotel column to surrogate_matches table
-- This allows administrators to track the hotel where the surrogate stays during transfer

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS transfer_hotel TEXT;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.transfer_hotel IS 'Hotel name where the surrogate stays during embryo transfer';
