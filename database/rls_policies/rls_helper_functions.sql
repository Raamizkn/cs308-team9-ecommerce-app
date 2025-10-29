/** 
These helper function will be used to check what type of user is using the API
We need to know this to grant RLS privilegs to certain users and not to others
*/

-- Helper function to check if a user is a Sales Manager
CREATE OR REPLACE FUNCTION is_sales_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_managers WHERE uid = auth.uid()
  );
$$;

-- Helper function to check if a user is a Product Manager
CREATE OR REPLACE FUNCTION is_product_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.product_managers WHERE uid = auth.uid()
  );
$$;

-- Helper function to check if a user is a Support Agent
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents WHERE uid = auth.uid()
  );
$$;

-- Helper function to check if a user is a Customer
CREATE OR REPLACE FUNCTION is_customer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers WHERE uid = auth.uid()
  );
$$;