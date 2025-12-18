# Quick Start: Login as Sales Manager

## ?? Quick Steps

### 1. Create User in Supabase Dashboard
- Go to: **Supabase Dashboard** ? **Authentication** ? **Users** ? **Add user**
- Email: `sales@test.com` (or any email)
- Password: `password123` (or any password)
- ? Check **"Auto Confirm User"**
- Click **Create**
- **Copy the User UUID** (you'll need it)

### 2. Add to Sales Managers Table
In **Supabase SQL Editor**, run:
```sql
-- Replace 'YOUR-USER-UUID' with the UUID from step 1
INSERT INTO public.profiles (uid, name)
VALUES ('YOUR-USER-UUID', 'Sales Manager')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.sales_managers (uid)
VALUES ('YOUR-USER-UUID')
ON CONFLICT (uid) DO NOTHING;
```

### 3. Make Sure RLS Policies Are Set
Run this in **Supabase SQL Editor** (if not already done):
```sql
-- Enable RLS
ALTER TABLE public.sales_managers ENABLE ROW LEVEL SECURITY;

-- Create policy (if not exists)
CREATE POLICY "Users can check if they are a sales manager"
  ON public.sales_managers FOR SELECT
  USING (auth.uid() = uid);
```

### 4. Login on Website
1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/sales-manager/login`
3. Enter email and password from Step 1
4. Click **LOGIN**
5. You'll be redirected to `/sales-manager/dashboard` ?

## ?? Login URLs

- **Sales Manager Login**: `http://localhost:3000/sales-manager/login`
- **Regular Login** (auto-redirects sales managers): `http://localhost:3000/login`
- **Sales Manager Dashboard**: `http://localhost:3000/sales-manager/dashboard`

## ? Verify It Works

After logging in, you should see:
- Welcome message with your name
- Dashboard with 6 cards:
  - Pricing Management
  - Discount Campaigns  
  - Invoices
  - Revenue & Profit
  - Order Overview
  - Refund Requests

## ?? Troubleshooting

**"Access denied" error?**
? Make sure you ran Step 2 (added user to `sales_managers` table)

**"Permission denied" error?**
? Make sure you ran Step 3 (RLS policies are set up)

**Can't find user UUID?**
? In Supabase Dashboard ? Authentication ? Users ? Click on the user ? Copy the UUID from the URL or user details
