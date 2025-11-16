INSERT INTO public.categories
  (name)
VALUES 
  ('Harry Potter'),
  ('Pokemon'),
  ('Gwent'),
  ('Bakugan');

INSERT INTO public.products_belong_to
  (name, model, serial_number, description, price, stock_quantity, warranty_status, distributor_info,
    product_cost, cid)
VALUES
  -- Category 1: Harry Potter
  ('Elder Wand Replica', 'Noble Collection', 'HP-EW-001', 'A high-quality, hand-painted replica of Albus Dumbledore''s wand.', 39.99, 100, '1 Year', 'Wizarding World Inc.', 19.99, 1),
  
  -- Category 1: Harry Potter
  ('Time Turner Necklace', 'Spinning Replica', 'HP-TTN-002', 'A gold-plated, spinning replica of Hermione''s Time Turner.', 49.50, 50, '6 Months', 'Wizarding World Inc.', 25.00, 1),

  -- Category 2: Pokemon
  ('Charizard VMAX Battle Deck', 'Sword & Shield', 'PKM-SWSH-CZD99', 'A powerful, 60-card deck featuring Charizard, ready to play.', 24.99, 250, 'N/A', 'The Pokemon Company', 12.00, 2),

  -- Category 2: Pokemon
  ('Pikachu Plush (24 inch)', 'Jazwares', 'PKM-PLSH-PIKA24', 'A large, soft, and cuddly plush of the iconic Pokemon.', 29.99, 300, 'N/A', 'The Pokemon Company', 14.50, 2),

  -- Category 3: Gwent
  ('Skellige Faction Card Set', 'Physical Deck', 'GW-SK-DECK-01', 'A full, physical set of Skellige faction cards for real-life Gwent.', 49.99, 50, '3 Months', 'CD Projekt Red', 24.99, 3),

  -- Category 4: Bakugan
  ('Drago Nova Transforming Bakugan', 'Battle Brawlers', 'BKGN-DRAGO-88A', 'A transforming Bakugan with high-power BakuCores.', 19.99, 150, '3 Months', 'Spin Master', 9.50, 4),

  -- TEST PRODUCTS for Stock Visibility Feature
  -- Category 2: Pokemon
  ('Test Product1 (Low Stock)', 'Test Model', 'TEST-001', 'This product has less than 20 items - should show LOW STOCK badge.', 15.99, 15, '1 Year', 'Test Distributor', 7.99, 2),
  
  -- Category 2: Pokemon  
  ('Test Product2 (Out of Stock)', 'Test Model', 'TEST-002', 'This product is out of stock - ADD TO CART button should be disabled.', 19.99, 0, '1 Year', 'Test Distributor', 9.99, 2),
  
  -- Category 2: Pokemon
  ('Test Product3 (Normal Stock)', 'Test Model', 'TEST-003', 'This product has normal stock - no badge, button should work.', 25.99, 100, '1 Year', 'Test Distributor', 12.99, 2);
