-- Drop the trigger and function for discount notifications
-- This removes the automatic database trigger approach
-- Notifications are now handled by the backend API

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_notify_wishlist_on_discount ON public.applies_to;

-- Drop the function
DROP FUNCTION IF EXISTS public.notify_wishlist_users_on_discount();

-- Note: The discount_notifications table is kept as it's still used by the API

