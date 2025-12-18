-- wish_for schema
CREATE TABLE public.wish_for (
    uid UUID NOT NULL REFERENCES public.customers(uid)
        ON DELETE CASCADE,
    pid INT NOT NULL REFERENCES public.products_belong_to(pid)
        ON DELETE CASCADE,
    PRIMARY KEY (uid, pid)
)