-- Function to get all users who have specific products in their wishlist
-- Uses SECURITY DEFINER to bypass RLS, allowing sales managers to find wishlist users
-- This is needed because RLS normally prevents users from seeing others' wishlists

CREATE OR REPLACE FUNCTION public.get_wishlist_users_for_products(product_ids INTEGER[])
RETURNS TABLE (
  user_id UUID,
  product_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT wf.uid AS user_id, wf.pid AS product_id
  FROM public.wish_for wf
  WHERE wf.pid = ANY(product_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (sales managers need this)
GRANT EXECUTE ON FUNCTION public.get_wishlist_users_for_products(INTEGER[]) TO authenticated;

COMMENT ON FUNCTION public.get_wishlist_users_for_products IS 
'Returns all users who have the specified products in their wishlist. Uses SECURITY DEFINER to bypass RLS for notification purposes.';

