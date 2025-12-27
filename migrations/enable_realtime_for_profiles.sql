-- Enable Realtime replication for profiles table
-- This allows Supabase Realtime to listen for changes to the profiles table
-- Required for progress stage update notifications

-- Enable replication for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verify replication is enabled
-- You can check this in Supabase Dashboard > Database > Replication
-- The profiles table should appear in the list

COMMENT ON TABLE profiles IS 'User profiles table with Realtime enabled for progress stage updates';

