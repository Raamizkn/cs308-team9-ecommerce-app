-- Discount Notifications Table
-- Stores notifications for customers when discounts are applied to their wishlist items

CREATE TABLE IF NOT EXISTS public.discount_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL REFERENCES public.products_belong_to(pid) ON DELETE CASCADE,
  discount_id INT NOT NULL REFERENCES public.discount_campaigns(did) ON DELETE CASCADE,
  discount_rate NUMERIC(3, 2) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id, discount_id) -- Prevent duplicate notifications
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_discount_notifications_user_id ON public.discount_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_product_id ON public.discount_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_created_at ON public.discount_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_is_read ON public.discount_notifications(is_read);

-- Enable Row Level Security
ALTER TABLE public.discount_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
  ON public.discount_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
  ON public.discount_notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications" 
  ON public.discount_notifications 
  FOR INSERT 
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.discount_notifications IS 
'Stores notifications sent to customers when discounts are applied to products in their wishlist.';

COMMENT ON COLUMN public.discount_notifications.discount_rate IS 
'The discount rate (0.1 = 10%, 0.25 = 25%, etc.) applied to the product.';

COMMENT ON COLUMN public.discount_notifications.is_read IS 
'Whether the user has seen/read this notification.';

