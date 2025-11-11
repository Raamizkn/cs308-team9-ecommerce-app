-- RLS POLICIES FOR ROLE TABLES
-- These policies allow authenticated users to check their own role

-- Enable RLS on role tables
ALTER TABLE public.sales_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow users to check if they are a sales manager
CREATE POLICY "Users can check if they are a sales manager"
  ON public.sales_managers FOR SELECT
  USING (auth.uid() = uid);

-- Allow users to check if they are a product manager
CREATE POLICY "Users can check if they are a product manager"
  ON public.product_managers FOR SELECT
  USING (auth.uid() = uid);

-- Allow users to check if they are a support agent
CREATE POLICY "Users can check if they are a support agent"
  ON public.support_agents FOR SELECT
  USING (auth.uid() = uid);

-- Allow users to check if they are a customer
CREATE POLICY "Users can check if they are a customer"
  ON public.customers FOR SELECT
  USING (auth.uid() = uid);

-- Note: These policies only allow SELECT (read) operations
-- INSERT/UPDATE/DELETE operations should be restricted to admins/superusers
-- and handled through secure server-side functions or admin interfaces
