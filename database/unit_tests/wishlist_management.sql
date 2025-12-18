-- Tests for Wishlist Management POlicy
BEGIN;

CREATE OR REPLACE FUNCTION public.test_wishlist_management() RETURNS SETOF TEXT AS $$
DECLARE
    v_pid TEXT := 'PROD-123';
    v_uid UUID;
BEGIN
    RETURN NEXT plan(2);

    -- Setup: User
    INSERT INTO public.profiles (first_name, last_name, email, role)
    VALUES ('Wishlist', 'Tester', 'wish.tester@example.com', 'customer')
    RETURNING uid INTO v_uid;

    -- Note: Wishlist product_id is TEXT according to schema, so we don't strictly *need* a product in products_belong_to if the FK isn't there.
    -- Looking at the schema: `product_id TEXT NOT NULL`. No FK to products table in the `create_wishlist_table.sql`.
    -- So we can just use strings.

    -- 1. Safe Insert
    RETURN NEXT lives_ok(
        format('INSERT INTO public.wishlist (user_id, product_id) VALUES (''%s'', ''%s'')', v_uid, v_pid),
        'Should successfully add item to wishlist'
    );

    -- 2. Duplicate Insert Failure
    RETURN NEXT throws_ok(
        format('INSERT INTO public.wishlist (user_id, product_id) VALUES (''%s'', ''%s'')', v_uid, v_pid),
        '23505', -- unique_violation
        'Should fail when adding duplicate item to wishlist'
    );

    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_wishlist_management();

ROLLBACK;
