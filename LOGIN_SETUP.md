# Login Implementation - Minimal Setup

## What Was Changed

Your colleague said email should be in `auth.users` table (Supabase built-in), not in a custom users table. Here's what I did to make login work:

---

## Files Changed

### ✅ **1. Created SQL Script**
**File:** `scripts/06-setup-profiles-and-auth.sql`

Creates:
- `profiles` table with `uid` (links to auth.users.id) and `name`
- Trigger to auto-create profile when user signs up
- RLS policy so users can only see their own profile

### ✅ **2. Created API Route**
**File:** `app/api/users/route.ts`

Simple POST endpoint to create user profile (just stores name).

### ✅ **3. Updated Signup**
**File:** `app/signup/page.tsx`

Changed to not send email to profiles table (it's already in auth.users).

---

## How to Use

### Step 1: Run SQL Script
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `scripts/06-setup-profiles-and-auth.sql`
3. Paste and run it

### Step 2: Test
1. Go to http://localhost:3000/signup
2. Create an account
3. Go to http://localhost:3000/login
4. Login with your credentials
5. You'll be redirected to your profile page
6. Click the user icon in header to access profile anytime

---

## What Happens

**Signup:**
```
User fills form → Supabase creates auth user → Trigger creates profile → Done
```

**Login:**
```
User enters credentials → Supabase validates → Session created → User logged in
```

**Database Structure:**
```
auth.users (Supabase)    profiles (Your table)
├── id                   ├── uid → auth.users.id
├── email                ├── name
├── password             └── created_at
```

---

That's it! Simple and minimal. Email is in `auth.users`, name is in `profiles`.

