-- CATEGORIES

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- Anyone should be able to see the categoris
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    USING (true);


-- PRODUCTS_BELONG_TO

ALTER TABLE public.products_belong_to ENABLE ROW LEVEL SECURITY;
-- Anyone should be able to see the products
CREATE POLICY "Allow public read access to products"
    ON public.products_belong_to FOR SELECT
    using (true);


-- DISCOUNT_CAMPAIGNS

ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY
-- Anyone should be able to access the discount campaigns in order to calcualte discounted price
CREATE POLICY "Allow public read access to discount campaigns"
    ON public.discount_campaigns FOR SELECT
    USING (true);


-- applies_to

ALTER TABLE public.applies_to ENABLE ROW LEVEL SECURITY;
-- Anyone should be able to see if a product has a discount campaign
CREATE POLICY "Allow public read access to discount mappings of products"
    ON public.discount_campaigns FOR SELECT
    USING (true);
