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


