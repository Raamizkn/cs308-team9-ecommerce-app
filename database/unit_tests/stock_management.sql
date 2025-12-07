-- Tests for Stock Management Logic
BEGIN;

-- Define tests inside a temporary function
CREATE OR REPLACE FUNCTION public.test_stock_management() RETURNS SETOF TEXT AS $$
DECLARE
    v_category_id INT;
    v_product_id INT;
    v_initial_stock INT := 50;
BEGIN
    -- Plan tests
    RETURN NEXT plan(5);

    -- 1. Setup Data
    INSERT INTO public.categories (name) VALUES ('Stock Test Cat') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING cid INTO v_category_id;

    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid, serial_number)
    VALUES ('Stock Test Product', 10.00, v_initial_stock, 5.00, v_category_id, 'SN-STOCK-TEST')
    RETURNING pid INTO v_product_id;


    -- 2. Test Safe Decrement
    -- Deduct 10
    PERFORM public.decrement_stock(v_product_id, 10);
    
    RETURN NEXT results_eq(
        format('SELECT stock_quantity FROM public.products_belong_to WHERE pid = %s', v_product_id),
        format('VALUES (%s)', v_initial_stock - 10),
        'Stock should be decremented by 10'
    );


    -- 3. Test Stock Floor (Prevent Negative)
    -- Current stock is 40. Try to deduct 45.
    -- Logic: GREATEST(stock - qty, 0) -> GREATEST(40 - 45, 0) -> 0
    PERFORM public.decrement_stock(v_product_id, 45);

    RETURN NEXT results_eq(
        format('SELECT stock_quantity FROM public.products_belong_to WHERE pid = %s', v_product_id),
        'VALUES (0)',
        'Stock should floor at 0 and not become negative'
    );


    -- 4. Test Invalid Input (Negative Quantity)
    -- Try to deduct -5 (which would essentially add stock, but we want to fail this misuse)
    RETURN NEXT throws_ok(
        format('SELECT public.decrement_stock(%s, -5)', v_product_id),
        'Quantity must be greater than 0',
        'Should raise exception for negative decrement quantity'
    );

    -- 5. Test Invalid Input (Product Not Found)
    RETURN NEXT throws_ok(
        'SELECT public.decrement_stock(9999999, 5)', -- Assuming 9999999 doesn't exist
        'Product with pid 9999999 not found',
        'Should raise exception if product does not exist'
    );

    -- 6. Test Zero Quantity (Edge Case)
    RETURN NEXT throws_ok(
        format('SELECT public.decrement_stock(%s, 0)', v_product_id),
        'Quantity must be greater than 0',
        'Should raise exception for zero quantity'
    );

    -- Finish
    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

-- EXECUTE 
SELECT * FROM public.test_stock_management();

-- ROLLBACK
ROLLBACK;
