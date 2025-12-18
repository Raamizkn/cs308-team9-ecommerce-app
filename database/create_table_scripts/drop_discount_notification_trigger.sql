-- Drop Discount Notification Trigger
-- This script removes the database trigger that was previously used for notifications
-- We now use an API-based approach instead (see /api/sales-manager/discounts/route.ts)
--
-- The trigger was querying the wrong table (wishlist) instead of the actual wishlist table (wish_for)
-- The API-based approach correctly queries wish_for and creates notifications

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_notify_wishlist_on_discount ON public.applies_to;

-- Drop the function
DROP FUNCTION IF EXISTS public.notify_wishlist_users_on_discount();

-- Verification: Check that trigger no longer exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_wishlist_on_discount';
-- Should return 0 rows if successfully dropped
