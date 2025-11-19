-- Function to safely restore product stock when an order is cancelled
-- This increments the stock quantity for a given product
-- Usage: SELECT restore_stock('product_id', quantity_to_restore);

CREATE OR REPLACE FUNCTION public.restore_stock(
  product_id INTEGER,
  quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Validate inputs
  IF quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- Update the stock quantity
  UPDATE public.products_belong_to
  SET stock_quantity = stock_quantity + quantity
  WHERE pid = product_id;

  -- Check if product exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with pid % not found', product_id;
  END IF;

  -- Log the stock restoration (optional, for debugging)
  RAISE NOTICE 'Restored % units to product ID %', quantity, product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.restore_stock(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_stock(INTEGER, INTEGER) TO anon;

-- Comments for documentation
COMMENT ON FUNCTION public.restore_stock(INTEGER, INTEGER) IS 
'Restores product stock when an order is cancelled. Increments stock_quantity by the specified amount.';


