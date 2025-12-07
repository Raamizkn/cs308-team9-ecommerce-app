-- Function to approve a refund request
-- 1. Updates the refund request status to 'approved' if it is currently 'pending'
-- 2. Increases the product stock by the refunded quantity
CREATE OR REPLACE FUNCTION public.approve_refund_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_refund_record RECORD;
  v_product_id INTEGER;
  v_refund_quantity INTEGER;
BEGIN
  -- Get refund request details
  SELECT * INTO v_refund_record
  FROM public.refund_requests
  WHERE id = request_id
  FOR UPDATE; -- Lock the row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund request with id % not found', request_id;
  END IF;

  IF v_refund_record.status != 'pending' THEN
    RAISE EXCEPTION 'Refund request is not pending (current status: %)', v_refund_record.status;
  END IF;

  -- specific logic to get product_id and quantity to restore
  SELECT product_id INTO v_product_id
  FROM public.order_items
  WHERE id = v_refund_record.order_item_id;

  v_refund_quantity := v_refund_record.quantity;

  -- Update refund status
  UPDATE public.refund_requests
  SET status = 'approved'
  WHERE id = request_id;

  -- Increment stock
  UPDATE public.products_belong_to
  SET stock_quantity = stock_quantity + v_refund_quantity
  WHERE pid = v_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Refund request approved and stock updated',
    'new_status', 'approved',
    'stock_restored', v_refund_quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a refund request
-- Just updates the status to 'rejected'
CREATE OR REPLACE FUNCTION public.reject_refund_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_refund_record RECORD;
BEGIN
  -- Get refund request details
  SELECT * INTO v_refund_record
  FROM public.refund_requests
  WHERE id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund request with id % not found', request_id;
  END IF;

  IF v_refund_record.status != 'pending' THEN
    RAISE EXCEPTION 'Refund request is not pending (current status: %)', v_refund_record.status;
  END IF;

  -- Update refund status
  UPDATE public.refund_requests
  SET status = 'rejected'
  WHERE id = request_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Refund request rejected',
    'new_status', 'rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.approve_refund_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_refund_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_refund_request(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_refund_request(UUID) TO service_role;

-- Comment
COMMENT ON FUNCTION public.approve_refund_request(UUID) IS 'Approves a refund request and creates stock adjustments.';
COMMENT ON FUNCTION public.reject_refund_request(UUID) IS 'Rejects a refund request.';
