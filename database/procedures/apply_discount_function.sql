CREATE OR REPLACE FUNCTION public.apply_discount_to_products(
  target_did INT,           -- The ID of the discount campaign
  target_pids INT[]         -- An array of Product IDs to apply it to
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN

  -- Perform the batch insert
  INSERT INTO public.applies_to (did, pid)
  SELECT target_did, p.pid
  FROM unnest(target_pids) AS p(pid)
  ON CONFLICT (did, pid) DO NOTHING;

END;
$$;