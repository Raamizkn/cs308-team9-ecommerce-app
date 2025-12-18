-- Add image_url column to products_belong_to table
ALTER TABLE public.products_belong_to
ADD COLUMN IF NOT EXISTS image_url TEXT;

