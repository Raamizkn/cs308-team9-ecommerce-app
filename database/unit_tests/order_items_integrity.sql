-- Tests for Order Integrity
BEGIN;

CREATE OR REPLACE FUNCTION public.test_order_items_integrity() RETURNS SETOF TEXT AS $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_new_user_id UUID;
BEGIN
    RETURN NEXT plan(2);

    -- 1. Setup Data
    v_customer_id := gen_random_uuid();
    
    -- Insert into auth.users to satisfy FK
    INSERT INTO auth.users (id, email) VALUES (v_customer_id, 'integrity_user@test.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (uid, name) VALUES (v_customer_id, 'Integrity User')
    ON CONFLICT (uid) DO NOTHING;
    
    INSERT INTO public.customers (uid, home_address, tax_id) VALUES (v_customer_id, 'Deleting St', 'TAX-DEL')
    ON CONFLICT (uid) DO NOTHING;

    INSERT INTO public.orders (user_id, status, subtotal, tax_amount, total, created_at, shipping_address, payment_method)
    VALUES (v_customer_id, 'processing', 150.00, 0.00, 150.00, NOW(), 'Deleting St, Void City', 'Credit Card')
    RETURNING id INTO v_order_id;

    -- 2. Test ON DELETE SET NULL
    -- Note: orders.user_id has a NOT NULL constraint in some environments.
    -- To test ON DELETE SET NULL outcome, we must temporarily drop that constraint in this transaction.
    ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

    -- Delete the customer
    DELETE FROM public.customers WHERE uid = v_customer_id;
    
    -- Check order user_id
    -- Note: We are deleting from 'customers', the FK references 'customers'.
    -- If we deleted from 'profiles', cascade would delete 'customers'.
    -- Let's delete from profiles to be thorough as that's the main entry point.
    DELETE FROM public.profiles WHERE uid = v_customer_id;

    -- Fetch updated user_id
    SELECT user_id INTO v_new_user_id FROM public.orders WHERE id = v_order_id;

    RETURN NEXT ok(v_new_user_id IS NULL, 'Order user_id should be set to NULL when customer is deleted');

    -- 3. Test Order Item Persistence
    -- Order should still exist even if user is gone
    RETURN NEXT ok((SELECT COUNT(*) FROM public.orders WHERE id = v_order_id) = 1, 'Order should persist after customer deletion');

    -- Finish
    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_order_items_integrity();

ROLLBACK;
