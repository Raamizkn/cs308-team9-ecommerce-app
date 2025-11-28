CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_item_id ON public.refund_requests(order_item_id);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create refund requests"
  ON public.refund_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view refund requests"
  ON public.refund_requests FOR SELECT
  USING (true);