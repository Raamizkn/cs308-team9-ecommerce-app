-- Tests for Revenue and Profit Calculation Logic
BEGIN;

-- Define tests inside a temporary function
CREATE OR REPLACE FUNCTION public.test_revenue_profit_analysis() RETURNS SETOF TEXT AS $$
DECLARE
    v_category_id INT;
    v_product_id INT;
    v_order_id UUID;
    v_customer_id UUID;
BEGIN
    -- Plan tests
    RETURN NEXT plan(3);

    -- 1. Setup Data
    -- Create Category
    INSERT INTO public.categories (name) VALUES ('Profit Test Cat') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING cid INTO v_category_id;

    -- Create Product with Cost = 50.00
    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid)
    VALUES ('Profit Test Product', 100.00, 100, 50.00, v_category_id)
    RETURNING pid INTO v_product_id;

    -- Create Customer (Use random UUID for UID)
    v_customer_id := gen_random_uuid();

    -- Insert into auth.users to satisfy FK
    INSERT INTO auth.users (id, email) VALUES (v_customer_id, 'profit_test@test.com')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.profiles (uid, name) VALUES (v_customer_id, 'Profit Test User')
    ON CONFLICT (uid) DO NOTHING;
    
    -- Note: Role Logic is likely in subclass tables, not profiles.
    -- If trigger auto-creates profile from auth.users, we might be bypassing it here, 
    -- but for unit tests we need direct control.
    
    INSERT INTO public.customers (uid, home_address, tax_id) VALUES (v_customer_id, '123 Test St', 'TAX-123')
    ON CONFLICT (uid) DO NOTHING;

    -- Create Order with specific timestamp to isolate test
    INSERT INTO public.orders (user_id, status, subtotal, tax_amount, total, created_at, shipping_address, payment_method)
    VALUES (v_customer_id, 'delivered', 180.00, 20.00, 200.00, '2000-01-01 12:00:00+00', '123 Test St, Test City', 'Credit Card')
    RETURNING id INTO v_order_id;

    -- Create Order Items: 2 items @ 100.00 each
    INSERT INTO public.order_items (order_id, product_id, quantity, price, created_at)
    VALUES (v_order_id, v_product_id, 2, 100.00, '2000-01-01 12:00:00+00');

    -- Debug: Verify inserted data
    RAISE NOTICE 'Order ID: %, Created: 2000-01-01', v_order_id;
    RAISE NOTICE 'Order Items Price: 100.00, Qty: 2';

    -- 2. Test Function Execution (Day Bucket) - Filter by specific date range to avoid existing data
    RETURN NEXT results_eq(
        'SELECT revenue, cost, profit FROM public.get_revenue_profit(''2000-01-01 00:00:00+00'', ''2000-01-02 00:00:00+00'', ''day'')',
        'VALUES (200.00, 100.00, 100.00)',
        'Revenue, Cost, and Profit should be calculated correctly (Isolated)'
    );

    -- 3. Test Date Filtering (Future)
    RETURN NEXT is_empty(
        'SELECT * FROM public.get_revenue_profit(NOW() + interval ''1 day'', NULL, ''day'')',
        'Should return no results for future start date'
    );
    
    -- 4. Test Invalid Bucket
    RETURN NEXT throws_ok(
        'SELECT * FROM public.get_revenue_profit(NULL, NULL, ''invalid_bucket'')',
        'Unsupported bucket interval: invalid_bucket',
        'Should raise exception for invalid bucket'
    );

    -- Finish
    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

-- EXECUTE 
SELECT * FROM public.test_revenue_profit_analysis();

-- ROLLBACK
ROLLBACK;
