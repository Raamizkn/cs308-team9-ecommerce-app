-- Tests for Category Usage
BEGIN;

CREATE OR REPLACE FUNCTION public.test_category_usage() RETURNS SETOF TEXT AS $$
DECLARE
    v_cat_id INT;
BEGIN
    RETURN NEXT plan(2);

    -- 1. Test Successful Category Creation
    INSERT INTO public.categories (name) VALUES ('Test Unique Category 1')
    RETURNING cid INTO v_cat_id;

    RETURN NEXT results_eq(
        format('SELECT name FROM public.categories WHERE cid = %s', v_cat_id),
        'VALUES (''Test Unique Category 1'')',
        'Should successfully create a category'
    );

    -- 2. Test Duplicate Category Failure
    RETURN NEXT throws_ok(
        'INSERT INTO public.categories (name) VALUES (''Test Unique Category 1'')',
        '23505', -- unique_violation
        'Should fail when creating a duplicate category'
    );

    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_category_usage();

ROLLBACK;
