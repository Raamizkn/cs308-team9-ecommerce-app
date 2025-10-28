CREATE TABLE public.profiles (
    uid uuid PRIMARY KEY REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    name TEXT
);