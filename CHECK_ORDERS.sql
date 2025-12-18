-- Check if orders exist for your user
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users

-- First, get your user ID:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Then check orders (replace the UUID with your user ID):
SELECT 
  id,
  user_id,
  total,
  status,
  created_at
FROM orders 
WHERE user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check order_items:
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  oi.price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.user_id IS NOT NULL
ORDER BY oi.created_at DESC
LIMIT 10;

