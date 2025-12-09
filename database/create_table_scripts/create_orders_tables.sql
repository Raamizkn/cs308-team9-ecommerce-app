-- Create Orders and Order Items Tables

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'in-transit', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products_belong_to(pid),
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders" 
  ON public.orders FOR SELECT 
  USING (true);

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

CREATE POLICY "Anyone can create order items" 
  ON public.order_items FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items" 
  ON public.order_items FOR SELECT 
  USING (true);
