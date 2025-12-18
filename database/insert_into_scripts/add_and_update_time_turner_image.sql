-- Step 1: Add image_url column to products_belong_to table (if it doesn't exist)
ALTER TABLE public.products_belong_to
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Step 2: Update Time Turner Necklace product with image URL
UPDATE public.products_belong_to
SET image_url = '/time-turner-necklace.png'
WHERE name = 'Time Turner Necklace';

