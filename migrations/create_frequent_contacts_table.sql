-- Frequent contacts directory for clinics, attorneys, brokers, etc.
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS frequent_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'ivf_clinic',
    'attorney_escrow',
    'insurance_broker',
    'therapist',
    'ob_office',
    'retreat'
  )),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  company TEXT,
  website TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frequent_contacts_category ON frequent_contacts(category);
CREATE INDEX IF NOT EXISTS idx_frequent_contacts_name ON frequent_contacts(name);
CREATE INDEX IF NOT EXISTS idx_frequent_contacts_is_active ON frequent_contacts(is_active);

CREATE OR REPLACE FUNCTION update_frequent_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_frequent_contacts_updated_at_trigger ON frequent_contacts;
CREATE TRIGGER update_frequent_contacts_updated_at_trigger
  BEFORE UPDATE ON frequent_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_frequent_contacts_updated_at();

-- Admin dashboard uses service role (bypasses RLS). Enable RLS so anon cannot read/write.
ALTER TABLE frequent_contacts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE frequent_contacts IS 'Shared directory of frequently used clinics, attorneys, brokers, therapists, OB offices, and retreats';
COMMENT ON COLUMN frequent_contacts.category IS 'ivf_clinic | attorney_escrow | insurance_broker | therapist | ob_office | retreat';
COMMENT ON COLUMN frequent_contacts.contact_person IS 'Doctor, attorney, agent, or primary contact name';
COMMENT ON COLUMN frequent_contacts.company IS 'Optional company / escrow firm name';
