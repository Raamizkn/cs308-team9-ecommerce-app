-- Tests for Profile Subclass Constraints
BEGIN;

CREATE OR REPLACE FUNCTION public.test_profile_constraints() RETURNS SETOF TEXT AS $$
DECLARE
    v_pm_id UUID;
    v_count INT;
BEGIN
    RETURN NEXT plan(2);

    -- 1. Setup Product Manager
    v_pm_id := gen_random_uuid();
    
    -- Insert into auth.users to satisfy FK
    INSERT INTO auth.users (id, email) VALUES (v_pm_id, 'pm_constraint@test.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (uid, name) VALUES (v_pm_id, 'PM Constraint User')
    ON CONFLICT (uid) DO NOTHING;
    
    INSERT INTO public.product_managers (uid) VALUES (v_pm_id);

    -- Verify exists
    SELECT COUNT(*) INTO v_count FROM public.product_managers WHERE uid = v_pm_id;
    RETURN NEXT is(v_count, 1, 'Product Manager should be created');

    -- 2. Test Cascade Deletion
    -- Delete from profiles
    DELETE FROM public.profiles WHERE uid = v_pm_id;

    -- Verify deleted from subclass table
    SELECT COUNT(*) INTO v_count FROM public.product_managers WHERE uid = v_pm_id;
    RETURN NEXT is(v_count, 0, 'subclass record should be deleted via cascade');

    RETURN QUERY SELECT * FROM finish();
END;
$$ LANGUAGE plpgsql;

SELECT * FROM public.test_profile_constraints();

ROLLBACK;
