-- Migration script to update order statuses
-- 1. Drop existing check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Update existing data
-- Update 'pending' to 'processing'
UPDATE public.orders SET status = 'processing' WHERE status = 'pending';

-- Update 'shipped' to 'in-transit'
UPDATE public.orders SET status = 'in-transit' WHERE status = 'shipped';

-- 3. Add new check constraint
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('processing', 'in-transit', 'delivered', 'cancelled'));

-- 4. Set default value (if not already set correctly, though table definition usually handles it)
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'processing';
