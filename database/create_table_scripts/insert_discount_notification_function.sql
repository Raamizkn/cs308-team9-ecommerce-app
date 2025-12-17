-- Function to insert discount notifications bypassing RLS
-- This allows sales managers to create notifications for customers
-- Uses SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION public.insert_discount_notification(
  p_user_id UUID,
  p_product_id INTEGER,
  p_discount_id INTEGER,
  p_discount_rate NUMERIC
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.discount_notifications (
    user_id,
    product_id,
    discount_id,
    discount_rate,
    is_read
  )
  VALUES (
    p_user_id,
    p_product_id,
    p_discount_id,
    p_discount_rate,
    FALSE
  )
  ON CONFLICT (user_id, product_id, discount_id) DO NOTHING
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_discount_notification(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.insert_discount_notification IS 
'Inserts a discount notification for a user. Uses SECURITY DEFINER to bypass RLS.';

