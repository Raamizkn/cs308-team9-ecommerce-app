-- Insert categories
INSERT INTO categories (name, slug, description, icon) VALUES
  ('Avatars', 'avatars', 'Unique pixelated profile pictures and character avatars', '😀'),
  ('Game Sprites', 'game-sprites', 'Retro game characters and animated sprites', '🎮'),
  ('Collectible Art', 'collectible-art', 'Limited edition pixel art masterpieces', '🎨'),
  ('Icons & UI', 'icons-ui', 'Pixel perfect icons and interface elements', '🔲'),
  ('Backgrounds', 'backgrounds', 'Tiled and seamless pixel backgrounds', '🌄'),
  ('Weapons & Items', 'weapons-items', 'Game items, weapons, and power-ups', '⚔️')
ON CONFLICT (slug) DO NOTHING;
