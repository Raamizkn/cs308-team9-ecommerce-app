-- Trigger Function: Notify Wishlist Users When Discount is Applied
-- This function is called automatically when a discount is linked to a product
-- It finds all users who have that product in their wishlist and creates notifications

CREATE OR REPLACE FUNCTION public.notify_wishlist_users_on_discount()
RETURNS TRIGGER AS $$
DECLARE
  wishlist_user RECORD;
  discount_rate_value NUMERIC(3, 2);
  product_pid_text TEXT;
BEGIN
  -- Get the discount rate from the discount_campaigns table
  SELECT rate INTO discount_rate_value
  FROM public.discount_campaigns
  WHERE did = NEW.did;

  -- If discount rate not found, skip notification
  IF discount_rate_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convert pid to text for comparison (wishlist might store as TEXT)
  product_pid_text := NEW.pid::TEXT;

  -- Loop through all users who have this product in their wishlist
  -- Wishlist.product_id might be UUID (from products table) or INTEGER/TEXT (from products_belong_to)
  -- We'll check both possibilities
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
    ON CONFLICT (user_id, product_id, discount_id) DO NOTHING; -- Prevent duplicates
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
-- This fires AFTER a discount is linked to a product (INSERT into applies_to table)
-- Note: If trigger already exists, you'll need to drop it first manually
CREATE TRIGGER trigger_notify_wishlist_on_discount
  AFTER INSERT ON public.applies_to
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wishlist_users_on_discount();

-- Comments for documentation
COMMENT ON FUNCTION public.notify_wishlist_users_on_discount() IS 
'Automatically creates notifications for all users who have a product in their wishlist when a discount is applied to that product.';

