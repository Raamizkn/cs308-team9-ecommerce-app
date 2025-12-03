-- Start transaction
BEGIN;

-- Number of tests
SELECT plan(6);

-- Clean up before test
DELETE FROM public.refund_requests WHERE order_item_id IN (
    SELECT id FROM public.order_items WHERE order_id IN (
        SELECT id FROM public.orders WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    )
);
DELETE FROM public.order_items WHERE order_id IN (
    SELECT id FROM public.orders WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);
DELETE FROM public.orders WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM public.customers WHERE uid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM public.profiles WHERE uid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM auth.users WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';


-- Our tests
CREATE OR REPLACE FUNCTION public.test_refund_logic() RETURNS SETOF TEXT AS $$
DECLARE
    v_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_order_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    v_item_id UUID := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    v_fake_user UUID := gen_random_uuid(); -- Generate this once so we can use it in expectation
    v_category_id INT;
    v_product_id INT;
BEGIN
    
    -- 1. Create Mock Auth User
    INSERT INTO auth.users (id, email) VALUES (v_user_id, 'test@example.com');
    
    -- 2. Create Profile
    INSERT INTO public.profiles (uid, name) VALUES (v_user_id, 'Test User')
    ON CONFLICT (uid) DO UPDATE SET name = EXCLUDED.name;
    
    -- 3. Create Customer
    INSERT INTO public.customers (uid, home_address, tax_id) 
    VALUES (v_user_id, '123 Test Lane', 'TAX-12345');

    -- 4. Create Category and Product
    INSERT INTO public.categories (name) VALUES ('Refund Test Cat') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING cid INTO v_category_id;

    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid, serial_number)
    VALUES ('Refund Test Product', 20.00, 100, 10.00, v_category_id, 'SN-REFUND-TEST')
    RETURNING pid INTO v_product_id;

    -- 5. Create Order
    INSERT INTO public.orders (id, user_id, status, total, created_at, shipping_address, payment_method)
    VALUES (v_order_id, v_user_id, 'delivered', 100.00, NOW() - INTERVAL '1 day', '123 Test Lane', 'Credit Card');

    -- 6. Create Order Item
    INSERT INTO public.order_items (id, order_id, product_id, quantity, price)
    VALUES (v_item_id, v_order_id, v_product_id, 5, 20.00);

    -- Start testing
    -- Test 1: Successful Refund Request
    RETURN NEXT lives_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', 2)', v_user_id, v_item_id),
        'Should successfully create a refund request for valid data'
    );

    -- Test 2: Negative Quantity
    RETURN NEXT throws_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', -1)', v_user_id, v_item_id),
        'Quantity must be positive',
        'Should fail for negative quantity'
    );

    -- Test 3: Excessive Quantity
    -- Logic: We requested 2 in Test 1. Asking for 4 more = 6. Max is 5.
    -- Error will look like: "Refund quantity exceeds purchased quantity (6 > 5)"
    RETURN NEXT throws_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', 4)', v_user_id, v_item_id),
        format('Refund quantity exceeds purchased quantity (6 > 5)'),
        'Should fail if total refund quantity exceeds purchased amount'
    );

    -- Test 4: Wrong User
    -- Error will contain the exact UUIDs: "Order item [item_id] not found for user [fake_id]"
    RETURN NEXT throws_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', 1)', v_fake_user, v_item_id),
        format('Order item %s not found for user %s', v_item_id, v_fake_user),
        'Should fail if user does not own the order'
    );

    -- Test 5: Order Not Delivered
    UPDATE public.orders SET status = 'processing' WHERE id = v_order_id;
    
    RETURN NEXT throws_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', 1)', v_user_id, v_item_id),
        format('Order %s must be delivered before requesting a refund', v_order_id),
        'Should fail if order is not delivered'
    );

    -- Test 6: Expired Refund Window
    UPDATE public.orders 
    SET status = 'delivered', created_at = NOW() - INTERVAL '31 days' 
    WHERE id = v_order_id;

    RETURN NEXT throws_ok(
        format('SELECT public.create_refund_request(''%s'', ''%s'', 1)', v_user_id, v_item_id),
        format('Refund window expired for order %s', v_order_id),
        'Should fail if order is older than 30 days'
    );

END;
$$ LANGUAGE plpgsql;

-- Execute tests
SELECT * FROM public.test_refund_logic();

-- Rollback everything
ROLLBACK;