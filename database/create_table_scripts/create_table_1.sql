-- Create profile subclass tables
create table public.customers (
  uid UUID primary key references public.profiles (uid) on delete CASCADE,
  home_address TEXT not null,
  tax_id TEXT unique not null
);

create table public.product_managers (
  uid UUID primary key references public.profiles (uid) on delete CASCADE
);

create table public.sales_managers (
  uid UUID primary key references public.profiles (uid) on delete CASCADE
);

create table public.support_agents (
  uid UUID primary key references public.profiles (uid) on delete CASCADE
);


-- create categories table
CREATE TABLE public.categories (
  cid INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, 
  name TEXT NOT NULL UNIQUE
)

-- create product table
CREATE TABLE public.products_belong_to (
  pid INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
  warranty_status TEXT,
  distributor_info TEXT,
  product_cost NUMERIC(10, 2) NOT NULL CHECK (product_cost >= 0),
  cid INT NOT NULL,
  FOREIGN KEY (cid) REFERENCES public.categories(cid)
    ON DELETE RESTRICT
);

-- create discount campaign table
CREATE TABLE public.discount_campaigns (
  did INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rate NUMERIC(3, 2) NOT NULL CHECK (rate > 0 AND rate <= 1)
);

-- create has_discount table
CREATE TABLE public.has_discount (
  did INT,
  pid INT,
  PRIMARY KEY(did, pid),
  FOREIGN KEY (did) REFERENCES public.discount_campaigns(did)
    ON DELETE CASCADE,
  FOREIGN KEY (pid) REFERENCES public.products_belong_to(pid)
    ON DELETE CASCADE
);

-- create shopping cart table
CREATE TABLE public.shopping_cart_assigned_to (
  cart_id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid UUID UNIQUE REFERENCES public.customers(uid)
    ON DELETE CASCADE
);

-- create contain_item table
CREATE TABLE contains_item (
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  cart_id INT,
  pid INT,
  PRIMARY KEY (cart_id, pid),
  FOREIGN KEY(cart_id) REFERENCES public.shopping_cart_assigned_to(cart_id)
    ON DELETE CASCADE,
  FOREIGN KEY(pid) REFERENCES public.products_belong_to(pid)
    ON DELETE CASCADE 
);

