-- Only product managers can edit categories
CREATE POLICY "Allow Product Managers to manage categories"
  ON public.categories FOR ALL
  USING (is_product_manager())
  WITH CHECK (is_product_manager());

-- Only Product managers can edit products
CREATE POLICY "Allow Product Managers to manage products"
  ON public.products_belong_to FOR ALL
  USING (is_product_manager())
  WITH CHECK (is_product_manager());

-- Only sales manager can manage disccount campaigns
CREATE POLICY "Allow Sales Managers to manage discount campaigns"
  ON public.discount_campaigns FOR ALL
  USING (is_sales_manager())
  WITH CHECK (is_sales_manager());


ALTER TABLE public.applies_to ENABLE ROW LEVEL SECURITY;
-- Anyone can see which products have discounts
CREATE POLICY "Allow public read access to discount mappings"
  ON public.applies_to FOR SELECT
  USING (true);