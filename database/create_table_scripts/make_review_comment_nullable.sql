-- Make comment and rating nullable in reviews table
-- Customers can rate without commenting, or comment without rating
-- Ratings are always visible (auto-approved), comments require approval

ALTER TABLE public.reviews 
ALTER COLUMN comment DROP NOT NULL;

ALTER TABLE public.reviews 
ALTER COLUMN rating DROP NOT NULL;

-- Update check constraint to allow NULL rating
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
