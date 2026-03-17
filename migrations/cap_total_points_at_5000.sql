-- Enforce a hard cap of 5000 points for each user.

CREATE OR REPLACE FUNCTION update_user_total_points()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  UPDATE profiles
  SET total_points = LEAST(
    5000,
    COALESCE(
      (
        SELECT SUM(points)
        FROM points_rewards
        WHERE user_id = target_user_id
      ),
      0
    )
  )
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_total_points_trigger ON points_rewards;

CREATE TRIGGER update_total_points_trigger
  AFTER INSERT OR UPDATE OR DELETE ON points_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_user_total_points();

-- One-time data correction for existing users whose total_points already exceeded the cap.
UPDATE profiles
SET total_points = LEAST(5000, COALESCE(total_points, 0))
WHERE total_points > 5000;
