-- Update RLS Policy for Orders Table
-- Only product managers can update orders (change status)
-- Customers can only cancel their own orders

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;

-- Policy 1: Product managers can update any order (full access)
CREATE POLICY "Product managers can update orders" 
  ON public.orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.product_managers 
      WHERE uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_managers 
      WHERE uid = auth.uid()
    )
  );

-- Policy 2: Customers can cancel their own orders
-- They can only update their own orders and only set status to 'cancelled'
-- Note: The API route enforces that order must be in "processing" status before cancellation
CREATE POLICY "Customers can cancel their own orders" 
  ON public.orders FOR UPDATE 
  USING (
    -- Can read the order if they own it and are a customer
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.customers 
      WHERE uid = auth.uid()
    )
  )
  WITH CHECK (
    -- Can only update if:
    -- 1. They own the order
    -- 2. They are a customer
    -- 3. They are setting status to 'cancelled'
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.customers 
      WHERE uid = auth.uid()
    )
    AND status = 'cancelled'
  );

