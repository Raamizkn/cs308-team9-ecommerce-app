-- 1. Drop the table entirely if it exists
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Recreate the table exactly as desired
CREATE TABLE public.profiles (
    uid uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT
);

-- =====================================================
-- MINIMAL PROFILES SETUP FOR LOGIN
-- =====================================================
-- This creates the profiles table and auto-creates profiles on signup
-- Email is stored in auth.users (Supabase), name is stored in profiles

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = uid);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (uid, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

