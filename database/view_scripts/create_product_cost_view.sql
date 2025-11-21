-- View: product_cost_view
-- Exposes the effective cost per product, preferring any manually stored
-- cost value and falling back to the default 50% of the sale price.

CREATE OR REPLACE VIEW public.product_cost_view AS
SELECT
  p.pid AS product_id,
  COALESCE(p.product_cost, p.price * 0.5) AS calculated_cost
FROM public.products_belong_to AS p;

