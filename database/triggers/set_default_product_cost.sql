thereCREATE OR REPLACE FUNCTION public.calculate_default_cost()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- R11 Logic: If the product_cost is not set (NULL), calculate 50% of the price.
  IF NEW.product_cost IS NULL OR NEW.product_cost = 0 THEN
    NEW.product_cost := NEW.price * 0.50;
  END IF;
  
  RETURN NEW;
END;
$$;

-- This trigger executes the function before a new product row is saved
DROP TRIGGER IF EXISTS set_default_product_cost ON public.products_belong_to;
CREATE TRIGGER set_default_product_cost
BEFORE INSERT ON public.products_belong_to
FOR EACH ROW
EXECUTE FUNCTION public.calculate_default_cost();