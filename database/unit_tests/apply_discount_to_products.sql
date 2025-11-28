-- tests default price for products as well as applying discount to products
BEGIN;


-- =========================================================
-- DEFINE TESTS INSIDE A TEMPORARY FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.test_logic() RETURNS SETOF TEXT AS $$
BEGIN
    -- Plan the 5 tests
    RETURN NEXT plan(5);

    -- -----------------------------------------------------
    -- SETUP DATA
    -- -----------------------------------------------------
    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid)
    VALUES ('Test Product No Cost', 100.00, 10, NULL, 1);

    INSERT INTO public.products_belong_to (name, price, stock_quantity, product_cost, cid)
    VALUES ('Test Product With Cost', 100.00, 10, 80.00, 1);

    INSERT INTO public.discount_campaigns (rate) VALUES (0.25);

    -- -----------------------------------------------------
    -- RUN TESTS
    -- -----------------------------------------------------

    -- Test 1
    RETURN NEXT results_eq(
        'SELECT product_cost FROM public.products_belong_to WHERE name = ''Test Product No Cost''',
        'VALUES (50.00)',
        'Product cost should default to 50% of price when NULL'
    );

    -- Test 2
    RETURN NEXT results_eq(
        'SELECT product_cost FROM public.products_belong_to WHERE name = ''Test Product With Cost''',
        'VALUES (80.00)',
        'Product cost should NOT change if explicitly provided'
    );

    -- Test 3 (Run the procedure)
    RETURN NEXT lives_ok(
        'SELECT public.apply_discount_to_products(
            (SELECT did FROM public.discount_campaigns WHERE rate = 0.25 LIMIT 1),
            ARRAY(SELECT pid FROM public.products_belong_to WHERE name LIKE ''Test Product%'')
        )',
        'apply_discount_to_products function should run without error'
    );

    -- Test 4 (Verify count)
    RETURN NEXT is(
        (SELECT COUNT(*) FROM public.applies_to 
         WHERE did = (SELECT did FROM public.discount_campaigns WHERE rate = 0.25 LIMIT 1)),
        2::bigint,
        'Two products should be linked to the discount campaign'
    );

    -- Test 5 (Idempotency)
    RETURN NEXT lives_ok(
        'SELECT public.apply_discount_to_products(
            (SELECT did FROM public.discount_campaigns WHERE rate = 0.25 LIMIT 1),
            ARRAY(SELECT pid FROM public.products_belong_to WHERE name LIKE ''Test Product%'')
        )',
        'Running the function a second time should not crash'
    );

    -- Finish and report (This adds the summary lines to the output)
    RETURN QUERY SELECT * FROM finish();

END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- EXECUTE TESTS DIRECTLY
-- This forces Supabase to show every line of output in the results table
-- =========================================================
SELECT * FROM public.test_logic();

-- Rollback everything
ROLLBACK;