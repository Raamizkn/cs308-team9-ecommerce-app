-- Updated Trigger Function: Notify Wishlist Users When Discount is Applied
-- This function creates notifications AND sends discount alert emails via n8n webhook
-- Requires pg_net extension to be enabled: CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_wishlist_users_on_discount()
RETURNS TRIGGER AS $$
DECLARE
  wishlist_user RECORD;
  discount_rate_value NUMERIC(3, 2);
  product_pid_text TEXT;
  app_url TEXT;
  notification_id UUID;
BEGIN
  -- Get the discount rate from the discount_campaigns table
  SELECT rate INTO discount_rate_value
  FROM public.discount_campaigns
  WHERE did = NEW.did;

  -- If discount rate not found, skip notification
  IF discount_rate_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get app URL from environment variable or use default
  -- Note: In Supabase, you can set this via: ALTER DATABASE postgres SET app.settings.app_url = 'https://your-app.com';
  -- Or use a config table, or hardcode if needed
  app_url := current_setting('app.settings.app_url', true);
  IF app_url IS NULL OR app_url = '' THEN
    -- Fallback: try to get from a config table or use environment
    -- For now, we'll use a placeholder that should be set via database settings
    app_url := 'https://your-app-url.com'; -- REPLACE THIS with your actual app URL
  END IF;

  -- Convert pid to text for comparison (wishlist might store as TEXT)
  product_pid_text := NEW.pid::TEXT;

  -- Loop through all users who have this product in their wishlist
  FOR wishlist_user IN
    SELECT DISTINCT w.user_id
    FROM public.wishlist w
    WHERE 
      -- Case 1: product_id is stored as INTEGER or numeric TEXT matching pid
      (w.product_id::TEXT ~ '^[0-9]+$' AND w.product_id::INTEGER = NEW.pid)
      OR
      -- Case 2: product_id is stored as TEXT matching pid as text
      w.product_id::TEXT = product_pid_text
  LOOP
    -- Insert notification for this user
    INSERT INTO public.discount_notifications (
      user_id,
      product_id,
      discount_id,
      discount_rate,
      is_read
    )
    VALUES (
      wishlist_user.user_id,
      NEW.pid,
      NEW.did,
      discount_rate_value,
      FALSE
    )
    ON CONFLICT (user_id, product_id, discount_id) DO NOTHING
    RETURNING id INTO notification_id;

    -- If notification was created (not a duplicate), send email
    IF notification_id IS NOT NULL THEN
      -- Send email via API endpoint using pg_net (non-blocking)
      -- This will call the /api/discount-alerts/send-email endpoint
      PERFORM net.http_post(
        url := app_url || '/api/discount-alerts/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', wishlist_user.user_id::text,
          'product_id', NEW.pid,
          'discount_id', NEW.did,
          'discount_rate', discount_rate_value
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in notify_wishlist_users_on_discount: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION public.notify_wishlist_users_on_discount() IS 
'Automatically creates notifications and sends discount alert emails for all users who have a product in their wishlist when a discount is applied to that product. Requires pg_net extension.';

-- Note: To enable pg_net extension, run:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: To set the app URL, run:
-- ALTER DATABASE postgres SET app.settings.app_url = 'https://your-app-url.com';
-- Or create a config table and read from there

