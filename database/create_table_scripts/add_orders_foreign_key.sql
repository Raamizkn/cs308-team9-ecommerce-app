-- Add Foreign Key Constraint to orders.user_id
-- This ensures referential integrity with the customers table
-- Only customers can place orders (support agents, sales managers, etc. cannot)

-- First, check if there are any orphaned user_ids (user_ids that don't exist in customers)
-- Run this query first to see if there are any issues:
-- SELECT DISTINCT o.user_id 
-- FROM orders o 
-- WHERE o.user_id IS NOT NULL 
-- AND o.user_id NOT IN (SELECT uid FROM customers);

-- Add the foreign key constraint
-- Note: This will fail if there are existing orders with user_ids that don't exist in customers
ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.customers(uid) 
ON DELETE SET NULL;  -- If a customer is deleted, set user_id to NULL (preserve order history)

-- Add index for better query performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Note: order_items table does NOT have a user_id field
-- It only has order_id which references orders(id) - this is correct
-- The user_id is only in the orders table

