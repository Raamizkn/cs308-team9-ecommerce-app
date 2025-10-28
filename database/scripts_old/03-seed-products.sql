-- Get category IDs for reference
DO $$
DECLARE
  cat_avatars UUID;
  cat_sprites UUID;
  cat_art UUID;
  cat_icons UUID;
  cat_backgrounds UUID;
  cat_weapons UUID;
BEGIN
  SELECT id INTO cat_avatars FROM categories WHERE slug = 'avatars';
  SELECT id INTO cat_sprites FROM categories WHERE slug = 'game-sprites';
  SELECT id INTO cat_art FROM categories WHERE slug = 'collectible-art';
  SELECT id INTO cat_icons FROM categories WHERE slug = 'icons-ui';
  SELECT id INTO cat_backgrounds FROM categories WHERE slug = 'backgrounds';
  SELECT id INTO cat_weapons FROM categories WHERE slug = 'weapons-items';

  -- Insert products
  INSERT INTO products (name, description, price, category_id, image_url, stock, rating, review_count, is_limited_edition, edition_size) VALUES
    -- Avatars
    ('Cyber Punk Hero', 'A futuristic cyberpunk character with neon accents and attitude', 12.99, cat_avatars, '/placeholder.svg?height=200&width=200', 50, 4.8, 124, false, NULL),
    ('Pixel Wizard', 'Mystical wizard with flowing robes and magical staff', 14.99, cat_avatars, '/placeholder.svg?height=200&width=200', 30, 4.9, 89, true, 100),
    ('Space Explorer', 'Astronaut ready for intergalactic adventures', 11.99, cat_avatars, '/placeholder.svg?height=200&width=200', 75, 4.7, 156, false, NULL),
    ('Ninja Warrior', 'Stealthy ninja with traditional garb and katana', 13.99, cat_avatars, '/placeholder.svg?height=200&width=200', 40, 4.9, 203, false, NULL),
    ('Robot Companion', 'Friendly robot with expressive LED eyes', 10.99, cat_avatars, '/placeholder.svg?height=200&width=200', 60, 4.6, 98, false, NULL),
    
    -- Game Sprites
    ('Dragon Boss', 'Epic dragon sprite with fire-breathing animation frames', 24.99, cat_sprites, '/placeholder.svg?height=200&width=200', 25, 5.0, 67, true, 50),
    ('Knight Character Set', 'Complete knight sprite with walk, attack, and idle animations', 19.99, cat_sprites, '/placeholder.svg?height=200&width=200', 45, 4.8, 112, false, NULL),
    ('Zombie Horde Pack', 'Set of 5 different zombie sprites for your game', 16.99, cat_sprites, '/placeholder.svg?height=200&width=200', 55, 4.7, 88, false, NULL),
    ('Platformer Hero', 'Versatile platformer character with jump and run cycles', 15.99, cat_sprites, '/placeholder.svg?height=200&width=200', 70, 4.9, 145, false, NULL),
    ('Boss Battle Mech', 'Giant mech boss with multiple attack patterns', 29.99, cat_sprites, '/placeholder.svg?height=200&width=200', 15, 5.0, 34, true, 30),
    
    -- Collectible Art
    ('Sunset City', 'Stunning pixel art cityscape at golden hour', 34.99, cat_art, '/placeholder.svg?height=200&width=200', 20, 5.0, 78, true, 25),
    ('Cosmic Voyage', 'Abstract space scene with nebulas and stars', 28.99, cat_art, '/placeholder.svg?height=200&width=200', 35, 4.9, 56, true, 40),
    ('Retro Arcade', 'Nostalgic arcade cabinet collection', 22.99, cat_art, '/placeholder.svg?height=200&width=200', 50, 4.8, 92, false, NULL),
    ('Pixel Portrait #001', 'First in the exclusive portrait series', 49.99, cat_art, '/placeholder.svg?height=200&width=200', 10, 5.0, 23, true, 10),
    ('Neon Dreams', 'Vibrant neon-lit street scene', 31.99, cat_art, '/placeholder.svg?height=200&width=200', 28, 4.9, 67, true, 35),
    
    -- Icons & UI
    ('RPG Icon Pack', '50 essential RPG icons for inventory and UI', 9.99, cat_icons, '/placeholder.svg?height=200&width=200', 100, 4.7, 234, false, NULL),
    ('Social Media Icons', 'Pixel perfect social media icon set', 7.99, cat_icons, '/placeholder.svg?height=200&width=200', 150, 4.6, 189, false, NULL),
    ('Fantasy UI Kit', 'Complete fantasy game UI with buttons and frames', 18.99, cat_icons, '/placeholder.svg?height=200&width=200', 80, 4.9, 156, false, NULL),
    ('Emoji Pixel Set', '100 expressive pixel emoji', 12.99, cat_icons, '/placeholder.svg?height=200&width=200', 120, 4.8, 267, false, NULL),
    
    -- Backgrounds
    ('Starfield Parallax', 'Seamless space background with parallax layers', 14.99, cat_backgrounds, '/placeholder.svg?height=200&width=200', 65, 4.8, 98, false, NULL),
    ('Dungeon Tileset', 'Complete dungeon tileset with walls and floors', 21.99, cat_backgrounds, '/placeholder.svg?height=200&width=200', 45, 4.9, 123, false, NULL),
    ('Cyberpunk City', 'Futuristic city background with neon signs', 19.99, cat_backgrounds, '/placeholder.svg?height=200&width=200', 55, 4.7, 87, false, NULL),
    ('Forest Scene', 'Lush pixel forest with animated elements', 16.99, cat_backgrounds, '/placeholder.svg?height=200&width=200', 70, 4.8, 134, false, NULL),
    
    -- Weapons & Items
    ('Legendary Sword Pack', 'Collection of 10 epic pixel swords', 13.99, cat_weapons, '/placeholder.svg?height=200&width=200', 85, 4.9, 178, false, NULL),
    ('Potion Collection', '20 different magical potions and elixirs', 11.99, cat_weapons, '/placeholder.svg?height=200&width=200', 95, 4.7, 145, false, NULL),
    ('Treasure Chest Set', 'Various treasure chests and loot containers', 15.99, cat_weapons, '/placeholder.svg?height=200&width=200', 60, 4.8, 112, false, NULL),
    ('Power-Up Pack', 'Classic game power-ups and collectibles', 10.99, cat_weapons, '/placeholder.svg?height=200&width=200', 110, 4.6, 201, false, NULL)
  ON CONFLICT DO NOTHING;
END $$;
