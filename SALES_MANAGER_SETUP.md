# How to Login as Sales Manager - Step by Step Guide

## Prerequisites

1. ? RLS policies must be set up (run `database/rls_policies/rls_role_tables.sql`)
2. ? Supabase project is configured
3. ? Frontend is running

## Step 1: Create User in Supabase Auth

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** ? **Users**
3. Click **"Add user"** or **"Create new user"**
4. Fill in:
   - **Email**: e.g., `salesmanager@example.com`
   - **Password**: Choose a strong password (e.g., `SalesManager123!`)
   - **Auto Confirm User**: ? Check this (so email verification isn't needed)
5. Click **"Create user"**
6. **IMPORTANT**: Copy the **User UID** (it's a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Option B: Using Supabase SQL Editor

```sql
-- This creates the auth user (you'll need to use Supabase Admin API or Dashboard)
-- The user will be created in auth.users table automatically when they sign up
-- OR you can use Supabase Dashboard to create them
```

## Step 2: Add User Profile (if not auto-created)

Check if profile was auto-created (from your trigger), or create it manually:

```sql
-- In Supabase SQL Editor, run:
INSERT INTO public.profiles (uid, name)
VALUES ('<USER-UID-FROM-STEP-1>', 'Sales Manager')
ON CONFLICT (uid) DO NOTHING;
```

Replace `<USER-UID-FROM-STEP-1>` with the actual UUID from Step 1.

## Step 3: Add User to Sales Managers Table

This is the **critical step** that grants sales manager access:

```sql
-- In Supabase SQL Editor, run:
INSERT INTO public.sales_managers (uid)
VALUES ('<USER-UID-FROM-STEP-1>')
ON CONFLICT (uid) DO NOTHING;
```

Replace `<USER-UID-FROM-STEP-1>` with the actual UUID from Step 1.

## Step 4: Verify Setup

Run this query to verify everything is set up correctly:

```sql
-- Check if user exists in all necessary tables
SELECT 
  au.id as auth_user_id,
  au.email,
  p.name,
  CASE WHEN sm.uid IS NOT NULL THEN 'Yes' ELSE 'No' END as is_sales_manager
FROM auth.users au
LEFT JOIN public.profiles p ON p.uid = au.id
LEFT JOIN public.sales_managers sm ON sm.uid = au.id
WHERE au.email = 'salesmanager@example.com';
```

You should see:
- ? `auth_user_id`: UUID
- ? `email`: The email you used
- ? `name`: Sales Manager (or whatever you set)
- ? `is_sales_manager`: Yes

## Step 5: Login to Website

1. **Start your Next.js dev server** (if not running):
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

2. **Navigate to Sales Manager Login**:
   - Go to: `http://localhost:3000/sales-manager/login`
   - OR go to: `http://localhost:3000/login` (will auto-redirect sales managers)

3. **Enter Credentials**:
   - **Email**: `salesmanager@example.com` (or whatever you used)
   - **Password**: The password you set in Step 1

4. **Click "LOGIN"**

5. **You should be redirected to**: `/sales-manager/dashboard`

## Step 6: Verify Dashboard Access

You should see the Sales Manager Dashboard with these sections:
- ? Pricing Management
- ? Discount Campaigns
- ? Invoices
- ? Revenue & Profit
- ? Order Overview
- ? Refund Requests

## Troubleshooting

### Issue: "Access denied" or "not authorized as a sales manager"

**Solution**: Make sure Step 3 was completed - the user must be in `sales_managers` table:

```sql
-- Check if user is in sales_managers table
SELECT * FROM public.sales_managers WHERE uid = '<USER-UID>';
```

If no rows returned, add them:
```sql
INSERT INTO public.sales_managers (uid) VALUES ('<USER-UID>');
```

### Issue: "Permission denied" error

**Solution**: Make sure RLS policies are set up:

```sql
-- Run this in Supabase SQL Editor
-- (from database/rls_policies/rls_role_tables.sql)
ALTER TABLE public.sales_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check if they are a sales manager"
  ON public.sales_managers FOR SELECT
  USING (auth.uid() = uid);
```

### Issue: Login works but redirects to wrong page

**Solution**: Check the login code is checking roles correctly. The code should:
1. Authenticate user
2. Check `sales_managers` table
3. Redirect to `/sales-manager/dashboard` if found

### Issue: Can't create user in Supabase Dashboard

**Solution**: 
- Make sure you have admin access to the Supabase project
- Try using the Supabase CLI or Admin API
- Or use the regular signup flow, then manually add to `sales_managers` table

## Quick Setup Script

If you want to do it all at once, here's a complete SQL script:

```sql
-- 1. First, create the user in Supabase Dashboard (Authentication ? Users)
-- 2. Then get their UUID and run this:

-- Replace these values:
\set user_email 'salesmanager@example.com'
\set user_uid 'YOUR-USER-UUID-HERE'  -- Get this from auth.users table
\set user_name 'Sales Manager'

-- Create profile (if not exists)
INSERT INTO public.profiles (uid, name)
VALUES (:user_uid, :user_name)
ON CONFLICT (uid) DO UPDATE SET name = :user_name;

-- Add to sales_managers table
INSERT INTO public.sales_managers (uid)
VALUES (:user_uid)
ON CONFLICT (uid) DO NOTHING;

-- Verify
SELECT 
  au.email,
  p.name,
  CASE WHEN sm.uid IS NOT NULL THEN '? Sales Manager' ELSE '? Not Sales Manager' END as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.uid = au.id
LEFT JOIN public.sales_managers sm ON sm.uid = au.id
WHERE au.id = :user_uid;
```

## Alternative: Create via API Route (Future Enhancement)

You could also create an admin API route to automate this, but for now, the SQL method above is the simplest.
