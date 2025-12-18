-- Create Reviews Table
-- This table stores customer reviews for products
-- Reviews require product manager approval before being visible to customers

CREATE TABLE IF NOT EXISTS public.reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT NOT NULL,
  customer_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  
  -- Foreign key constraints with ON DELETE RESTRICT to preserve data integrity
  FOREIGN KEY (product_id) REFERENCES public.products_belong_to(pid)
    ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES public.customers(uid)
    ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES public.product_managers(uid)
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_approved_by ON public.reviews(approved_by);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can create reviews (insert their own reviews)
CREATE POLICY "Customers can create their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.customers WHERE uid = auth.uid())
  );

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

-- Customers can view their own reviews (regardless of status)
CREATE POLICY "Customers can view their own reviews"
  ON public.reviews FOR SELECT
  USING (customer_id = auth.uid());

-- Product managers can view all reviews
CREATE POLICY "Product managers can view all reviews"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_managers WHERE uid = auth.uid()
    )
  );

-- Product managers can update review status (approve/reject)
CREATE POLICY "Product managers can update reviews"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.product_managers WHERE uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_managers WHERE uid = auth.uid()
    )
  );

-- Customers can update their own pending reviews (to allow editing before approval)
CREATE POLICY "Customers can update their own pending reviews"
  ON public.reviews FOR UPDATE
  USING (
    customer_id = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    customer_id = auth.uid() AND
    status = 'pending'
  );

-- Product managers can delete reviews (for moderation purposes)
CREATE POLICY "Product managers can delete reviews"
  ON public.reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.product_managers WHERE uid = auth.uid()
    )
  );

