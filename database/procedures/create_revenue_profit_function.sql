-- Function: get_revenue_profit
-- Returns aggregated revenue, cost, and profit for orders within an optional
-- date range, grouped by day/week/month. Intended for sales manager analytics.

CREATE OR REPLACE FUNCTION public.get_revenue_profit(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(
  bucket TIMESTAMPTZ,
  revenue NUMERIC,
  cost NUMERIC,
  profit NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bucket TEXT := lower(coalesce(nullif(p_bucket, ''), 'day'));
BEGIN
  IF v_bucket NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'Unsupported bucket interval: %', p_bucket;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc(v_bucket, o.created_at) AS bucket,
    SUM(oi.price * oi.quantity)::numeric(18, 2) AS revenue,
    SUM(oi.quantity * pcv.calculated_cost)::numeric(18, 2) AS cost,
    (SUM(oi.price * oi.quantity) - SUM(oi.quantity * pcv.calculated_cost))::numeric(18, 2) AS profit
  FROM public.orders AS o
  JOIN public.order_items AS oi ON oi.order_id = o.id
  JOIN public.product_cost_view AS pcv ON pcv.product_id = oi.product_id
  WHERE (p_start IS NULL OR o.created_at >= p_start)
    AND (p_end IS NULL OR o.created_at <= p_end)
  GROUP BY bucket
  ORDER BY bucket;
END;
$$;

