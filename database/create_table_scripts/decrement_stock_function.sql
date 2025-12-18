-- Function to safely decrement product stock when an order is placed
-- This decrements the stock quantity for a given product
-- Usage: SELECT decrement_stock(product_id, quantity_to_decrement);

CREATE OR REPLACE FUNCTION public.decrement_stock(
  product_id INTEGER,
  quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Validate inputs
  IF quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- Update the stock quantity (prevent negative stock)
  UPDATE public.products_belong_to
  SET stock_quantity = GREATEST(stock_quantity - quantity, 0)
  WHERE pid = product_id;

  -- Check if product exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with pid % not found', product_id;
  END IF;

  -- Log the stock decrement (optional, for debugging)
  RAISE NOTICE 'Decremented % units from product ID %', quantity, product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_stock(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(INTEGER, INTEGER) TO anon;

-- Comments for documentation
COMMENT ON FUNCTION public.decrement_stock(INTEGER, INTEGER) IS 
'Decrements product stock when an order is placed. Decrements stock_quantity by the specified amount, preventing negative values.';

