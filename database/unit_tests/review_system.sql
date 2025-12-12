-- Tests for Review System Logic
BEGIN;

CREATE OR REPLACE FUNCTION public.test_review_system() RETURNS SETOF TEXT AS $$
DECLARE
    v_pid INT;
    v_uid UUID;
    v_cat_id INT;
BEGIN
    RETURN NEXT plan(3);

    -- Setup: Create category, product, and user (mocking user via execution context might be tricky in pure SQL unit tests if checks rely on auth.uid(), but basic table constraints don't)
    -- Ideally, we need a valid user ID. Since we are in a transaction and these are unit tests, we'll try to insert a dummy user if possible, or assume one exists.
    -- However, `profiles` table likely has triggers. Let's try inserting into profiles first.
    
    INSERT INTO public.profiles (first_name, last_name, email, role)
    VALUES ('Review', 'Tester', 'review.tester@example.com', 'customer')
    RETURNING uid INTO v_uid;

    INSERT INTO public.customers (uid, home_address, tax_id)
    VALUES (v_uid, '123 Test St', 'TAX-REVIEW-1');

    INSERT INTO public.categories (name) VALUES ('Review Test Cat')
    RETURNING cid INTO v_cat_id;

    INSERT INTO public.products_belong_to (name, price, stock_quantity, cid, serial_number)
    VALUES ('Review Product', 50.00, 10, v_cat_id, 'SN-REV-1')
    RETURNING pid INTO v_pid;

    -- 1. Test Review Rating > 5 (Constraint Check)
    RETURN NEXT throws_ok(
        format('INSERT INTO public.reviews (product_id, customer_id, rating, comment) VALUES (%s, ''%s'', 6, ''Too good!'')', v_pid, v_uid),
        'new row for relation "reviews" violates check constraint "reviews_rating_check"',
        'Should fail when rating is > 5'
    );

    -- 2. Test Review Rating < 1 (Constraint Check)
    RETURN NEXT throws_ok(
        format('INSERT INTO public.reviews (product_id, customer_id, rating, comment) VALUES (%s, ''%s'', 0, ''Too bad!'')', v_pid, v_uid),
        'new row for relation "reviews" violates check constraint "reviews_rating_check"',
        'Should fail when rating is < 1'
    );

    -- 3. Test Valid Review
    RETURN NEXT lives_ok(
        format('INSERT INTO public.reviews (product_id, customer_id, rating, comment) VALUES (%s, ''%s'', 5, ''Perfect!'')', v_pid, v_uid),
        'Should successfully insert a valid review'
    );

    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_review_system();

ROLLBACK;
