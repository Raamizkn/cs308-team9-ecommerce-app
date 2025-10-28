create table public.customers (
  uid uuid primary key references public.profiles (uid) on delete CASCADE,
  home_address TEXT not null,
  tax_id TEXT unique not null
);

create table public.product_managers (
  uid uuid primary key references public.profiles (uid) on delete CASCADE
);

create table public.sales_managers (
  uid uuid primary key references public.profiles (uid) on delete CASCADE
);

create table public.support_agents (
  uid uuid primary key references public.profiles (uid) on delete CASCADE
);