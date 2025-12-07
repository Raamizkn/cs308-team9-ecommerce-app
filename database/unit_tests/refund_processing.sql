-- Tests for Refund Processing Logic (Approval/Rejection)
BEGIN;

-- Define tests inside a temporary function
CREATE OR REPLACE FUNCTION public.test_refund_processing() RETURNS SETOF TEXT AS $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_order_id UUID := gen_random_uuid();
    v_item_id UUID := gen_random_uuid();
    v_refund_id_approve UUID := gen_random_uuid();
    v_refund_id_reject UUID := gen_random_uuid();
    v_missing_refund_id UUID := gen_random_uuid();
    v_category_id INT;
    v_product_id INT;
    v_initial_stock INT := 100;
    v_refund_qty INT := 5;
    v_stock_after_refund INT;
BEGIN
    -- Plan tests
    RETURN NEXT plan(7);

    -- 1. Setup Data
    -- Create User
    INSERT INTO auth.users (id, email) VALUES (v_user_id, 'refund_admin_test@example.com');
    INSERT INTO public.profiles (uid, name) VALUES (v_user_id, 'Refund Admin Test') ON CONFLICT DO NOTHING;
    INSERT INTO public.customers (uid, home_address, tax_id) VALUES (v_user_id, '123 Test Lane', 'TAX-TEST-123') ON CONFLICT DO NOTHING;

    -- Create Product
    INSERT INTO public.categories (name) VALUES ('Refund Admin Cat') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING cid INTO v_category_id;

    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid, serial_number)
    VALUES ('Refund Admin Product', 50.00, v_initial_stock, 25.00, v_category_id, 'SN-REFUND-ADMIN')
    RETURNING pid INTO v_product_id;

    -- Create Order
    INSERT INTO public.orders (id, user_id, status, total, created_at, shipping_address, payment_method)
    VALUES (v_order_id, v_user_id, 'delivered', 250.00, NOW() - INTERVAL '2 days', '123 Test St', 'Credit Card');

    -- Create Order Item
    INSERT INTO public.order_items (id, order_id, product_id, quantity, price)
    VALUES (v_item_id, v_order_id, v_product_id, 10, 50.00);

    -- Create Refund Request (To be Approved)
    INSERT INTO public.refund_requests (id, order_item_id, quantity, status)
    VALUES (v_refund_id_approve, v_item_id, v_refund_qty, 'pending');

    -- Create Refund Request (To be Rejected)
    INSERT INTO public.refund_requests (id, order_item_id, quantity, status)
    VALUES (v_refund_id_reject, v_item_id, v_refund_qty, 'pending');


    -- 2. Test Approval Logic
    -- Execute Approve Function
    PERFORM public.approve_refund_request(v_refund_id_approve);

    -- Verify Status is Approved
    RETURN NEXT results_eq(
        format('SELECT status FROM public.refund_requests WHERE id = ''%s''', v_refund_id_approve),
        'VALUES (''approved''::text)',
        'Refund request status should be updated to APPROVED'
    );

    -- Verify Stock Increased
    RETURN NEXT results_eq(
        format('SELECT stock_quantity FROM public.products_belong_to WHERE pid = %s', v_product_id),
        format('VALUES (%s)', v_initial_stock + v_refund_qty),
        'Product stock should increase by refund quantity after approval'
    );


    -- 3. Test Rejection Logic
    -- Execute Reject Function
    PERFORM public.reject_refund_request(v_refund_id_reject);

    -- Verify Status is Rejected
    RETURN NEXT results_eq(
        format('SELECT status FROM public.refund_requests WHERE id = ''%s''', v_refund_id_reject),
        'VALUES (''rejected''::text)',
        'Refund request status should be updated to REJECTED'
    );

    -- Verify Stock DID NOT Increase (Should still be Initial + Approved Qty)
    RETURN NEXT results_eq(
        format('SELECT stock_quantity FROM public.products_belong_to WHERE pid = %s', v_product_id),
        format('VALUES (%s)', v_initial_stock + v_refund_qty),
        'Product stock should NOT change after rejection' -- It stays at 105 from previous test
    );


    -- 4. Test Edge Cases (Double Processing)
    -- Try to approve the already approved request
    RETURN NEXT throws_ok(
        format('SELECT public.approve_refund_request(''%s'')', v_refund_id_approve),
        format('Refund request is not pending (current status: approved)'),
        'Should fail when trying to approve an already approved request'
    );

    -- Try to reject the already rejected request
    RETURN NEXT throws_ok(
        format('SELECT public.reject_refund_request(''%s'')', v_refund_id_reject),
        format('Refund request is not pending (current status: rejected)'),
        'Should fail when trying to reject an already rejected request'
    );

    -- Try to approve a non-existent request
    RETURN NEXT throws_ok(
        format('SELECT public.approve_refund_request(''%s'')', v_missing_refund_id),
        format('Refund request with id %s not found', v_missing_refund_id),
        'Should fail when trying to approve a non-existent request'
    );

    -- Finish
    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

-- EXECUTE 
SELECT * FROM public.test_refund_processing();

-- ROLLBACK
ROLLBACK;
