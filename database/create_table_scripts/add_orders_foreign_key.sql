-- Add Foreign Key Constraint to orders.user_id
-- This ensures referential integrity with the customers table
-- Only customers can place orders (support agents, sales managers, etc. cannot)

-- STEP 1: Check for orphaned records (run this first to see if there are issues)
-- Uncomment and run this query BEFORE running the ALTER TABLE command:
/*
SELECT DISTINCT o.user_id, COUNT(*) as order_count
FROM orders o 
WHERE o.user_id IS NOT NULL 
AND o.user_id NOT IN (SELECT uid FROM customers)
GROUP BY o.user_id;
*/

-- STEP 2: Drop existing constraint if it exists (in case you need to recreate it)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_user_id' 
        AND table_name = 'orders'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders DROP CONSTRAINT fk_orders_user_id;
        RAISE NOTICE 'Dropped existing constraint fk_orders_user_id';
    END IF;
END $$;

-- STEP 3: Add the foreign key constraint
-- This will fail if there are existing orders with user_ids that don't exist in customers
ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.customers(uid) 
ON DELETE SET NULL;  -- If a customer is deleted, set user_id to NULL (preserve order history)

-- STEP 4: Add index for better query performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Verification: Check that the constraint was created
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE constraint_name = 'fk_orders_user_id'
AND table_schema = 'public';

-- Note: order_items table does NOT have a user_id field
-- It only has order_id which references orders(id) - this is correct
-- The user_id is only in the orders table

