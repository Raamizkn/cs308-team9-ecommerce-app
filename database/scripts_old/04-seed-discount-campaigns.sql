-- Insert sample discount campaigns
INSERT INTO discount_campaigns (code, discount_percentage, valid_until, is_active) VALUES
  ('PIXEL10', 10, NOW() + INTERVAL '30 days', true),
  ('RETRO20', 20, NOW() + INTERVAL '14 days', true),
  ('VAULT15', 15, NOW() + INTERVAL '60 days', true),
  ('NEWUSER25', 25, NOW() + INTERVAL '90 days', true)
ON CONFLICT (code) DO NOTHING;
