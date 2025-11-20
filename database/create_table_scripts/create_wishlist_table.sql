-- Create wishlist table
-- Using user_id and product_id to match existing code expectations
CREATE TABLE IF NOT EXISTS public.wishlist (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- Using TEXT to handle string product IDs from frontend
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlist
CREATE POLICY "Users can view own wishlist" 
  ON public.wishlist FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" 
  ON public.wishlist FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" 
  ON public.wishlist FOR DELETE 
  USING (auth.uid() = user_id);

