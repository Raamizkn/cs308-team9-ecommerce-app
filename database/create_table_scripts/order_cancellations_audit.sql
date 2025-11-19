-- Order Cancellations Audit Table
-- Tracks all order cancellations for audit and analytics purposes
-- This helps with customer service, refund processing, and business insights

CREATE TABLE IF NOT EXISTS public.order_cancellations (
  cancellation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancellation_reason TEXT,
  order_total NUMERIC(10, 2),
  items_count INTEGER,
  stock_restored BOOLEAN DEFAULT TRUE,
  stock_restore_errors JSONB,
  cancelled_by_role TEXT CHECK (cancelled_by_role IN ('customer', 'sales_manager', 'product_manager', 'support_agent', 'system')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON public.order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_user_id ON public.order_cancellations(user_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_cancelled_at ON public.order_cancellations(cancelled_at DESC);

-- Enable Row Level Security
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own cancellations
CREATE POLICY "Users can view own cancellations" 
  ON public.order_cancellations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Admins can view all cancellations (adjust based on your role system)
CREATE POLICY "Admins can view all cancellations" 
  ON public.order_cancellations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.uid = auth.uid() 
      AND profiles.role IN ('sales_manager', 'product_manager', 'support_agent')
    )
  );

-- System/API can insert cancellation records
CREATE POLICY "System can insert cancellations" 
  ON public.order_cancellations 
  FOR INSERT 
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.order_cancellations IS 
'Audit log for all order cancellations. Tracks who cancelled, when, and any issues with stock restoration.';

COMMENT ON COLUMN public.order_cancellations.stock_restored IS 
'Whether product stock was successfully restored for all items in the cancelled order.';

COMMENT ON COLUMN public.order_cancellations.stock_restore_errors IS 
'JSON array of any errors encountered while restoring stock. Null if no errors.';

COMMENT ON COLUMN public.order_cancellations.cancelled_by_role IS 
'Role of the person who initiated the cancellation (customer, admin, or system).';


