-- Add customer_name and customer_email columns to orders table
-- This allows us to store checkout form details for invoice generation

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.orders.customer_name IS 'Customer name from checkout form (may differ from profile name)';
COMMENT ON COLUMN public.orders.customer_email IS 'Customer email from checkout form (may differ from profile email)';

