ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- Anyone should be able to see the categoris
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    USING (true);


ALTER TABLE public.products_belong_to ENABLE ROW LEVEL SECURITY;
-- Anyone should be able to see the products
CREATE POLICY "Allow public read access to products"
    ON public.products_belong_to FOR SELECT
    using (true);


