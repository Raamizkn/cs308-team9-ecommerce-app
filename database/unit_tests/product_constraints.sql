-- Tests for Product Constraints
BEGIN;

CREATE OR REPLACE FUNCTION public.test_product_constraints() RETURNS SETOF TEXT AS $$
DECLARE
    v_cat_id INT;
BEGIN
    RETURN NEXT plan(3);

    -- Setup: Need a category first
    INSERT INTO public.categories (name) VALUES ('Product Test Cat')
    RETURNING cid INTO v_cat_id;

    -- 1. Test Successful Product Creation
    RETURN NEXT lives_ok(
        format('INSERT INTO public.products_belong_to (name, price, stock_quantity, cid, serial_number) VALUES (''Valid Product'', 10.00, 5, %s, ''SN-VALID-1'')', v_cat_id),
        'Should successfully create a valid product'
    );

    -- 2. Test Invalid Price (Negative)
    RETURN NEXT throws_ok(
        format('INSERT INTO public.products_belong_to (name, price, stock_quantity, cid, serial_number) VALUES (''Invalid Price'', -10.00, 5, %s, ''SN-INVALID-P'')', v_cat_id),
        'new row for relation "products_belong_to" violates check constraint "products_belong_to_price_check"',
        'Should fail when price is negative'
    );

    -- 3. Test Invalid Stock (Negative)
    RETURN NEXT throws_ok(
        format('INSERT INTO public.products_belong_to (name, price, stock_quantity, cid, serial_number) VALUES (''Invalid Stock'', 10.00, -5, %s, ''SN-INVALID-S'')', v_cat_id),
        'new row for relation "products_belong_to" violates check constraint "products_belong_to_stock_quantity_check"',
        'Should fail when stock quantity is negative'
    );

    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_product_constraints();

ROLLBACK;
