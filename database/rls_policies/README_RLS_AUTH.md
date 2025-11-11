# RLS and Authentication Setup for Sales Manager Login

## Overview
The sales manager login implementation is fully compatible with Supabase Auth and Row Level Security (RLS). Here's how it works:

## Authentication Flow

1. **User Login**: Uses `supabase.auth.signInWithPassword()` which is the standard Supabase Auth method
2. **Role Verification**: After successful authentication, the code checks the role tables (`sales_managers`, `product_managers`, `support_agents`) to determine user permissions
3. **Redirect**: Based on role, users are redirected to appropriate dashboards

## RLS Policies

### Role Tables RLS Policies
Created in `database/rls_policies/rls_role_tables.sql`:

- **sales_managers**: Users can SELECT their own row (check if they are a sales manager)
- **product_managers**: Users can SELECT their own row (check if they are a product manager)
- **support_agents**: Users can SELECT their own row (check if they are a support agent)
- **customers**: Users can SELECT their own row (check if they are a customer)

### How RLS Works Here

1. **Authentication**: Supabase Auth handles user authentication and sets `auth.uid()` in the session
2. **RLS Enforcement**: When querying role tables, RLS policies check if `auth.uid() = uid`
3. **Result**: 
   - If user IS in the table ? Returns their row
   - If user is NOT in the table ? Returns empty (no error, just no data)

### Code Implementation

The login code uses `.maybeSingle()` instead of `.single()` to handle cases where:
- User exists in the role table ? Returns data
- User doesn't exist ? Returns null (not an error)

```typescript
const { data: salesManagerData, error: roleError } = await supabase
  .from("sales_managers")
  .select("uid")
  .eq("uid", authData.user.id)
  .maybeSingle() // Returns null if no row found (instead of throwing error)
```

## Security Features

? **Authentication**: Uses Supabase Auth (secure, encrypted passwords)
? **RLS Protection**: Role tables are protected by RLS policies
? **Role-Based Access**: Only users in `sales_managers` table can access sales manager dashboard
? **Session Management**: Supabase handles session tokens automatically
? **Secure Queries**: All queries respect RLS policies

## Database Helper Functions

The database includes helper functions (`is_sales_manager()`, etc.) that use `SECURITY DEFINER`:
- These are meant for use **within RLS policies** or **server-side functions**
- They bypass RLS because they run with elevated privileges
- **Not used in client-side code** - client code uses direct queries with RLS policies

## Setup Instructions

1. **Run RLS Policies**: Execute `database/rls_policies/rls_role_tables.sql` in your Supabase SQL editor
2. **Create Sales Manager**: Add a user to `sales_managers` table:
   ```sql
   -- First create auth user in Supabase Auth dashboard
   -- Then add to sales_managers table:
   INSERT INTO public.sales_managers (uid) 
   VALUES ('<user-uuid-from-auth-users>');
   ```
3. **Test Login**: Use the sales manager credentials to login at `/sales-manager/login`

## Notes

- RLS policies only allow **SELECT** operations on role tables
- **INSERT/UPDATE/DELETE** should be restricted to admins and handled server-side
- The `profiles` table already has RLS enabled (users can read their own profile)
- All role checks happen **after** authentication, ensuring `auth.uid()` is available
