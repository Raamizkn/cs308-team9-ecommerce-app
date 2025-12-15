-- RLS POLICY FOR PROFILES TABLE
-- Allow product managers and sales managers to read customer profiles
-- This is needed for review moderation and customer service

-- Allow product managers to read customer profiles (for review moderation)
CREATE POLICY "Product managers can read customer profiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.product_managers 
      WHERE uid = auth.uid()
    )
  );

-- Allow sales managers to read customer profiles (for customer service)
CREATE POLICY "Sales managers can read customer profiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_managers 
      WHERE uid = auth.uid()
    )
  );

