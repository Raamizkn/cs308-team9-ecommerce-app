CREATE TABLE public.customers (
  uid uuid PRIMARY KEY REFERENCES public.profiles (uid) ON DELETE CASCADE,
  home_address TEXT NOT NULL,
  tax_id TEXT UNIQUE NOT NULL
);

CREATE TABLE public.product_managers (
  uid uuid PRIMARY KEY REFERENCES public.profiles (uid) ON DELETE CASCADE
);

CREATE TABLE public.sales_managers (
  uid uuid PRIMARY KEY REFERENCES public.profiles (uid) ON DELETE CASCADE
);

CREATE TABLE public.support_agents (
  uid uuid PRIMARY KEY REFERENCES public.profiles (uid) ON DELETE CASCADE
);