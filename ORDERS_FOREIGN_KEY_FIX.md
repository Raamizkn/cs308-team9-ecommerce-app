# Orders Table Foreign Key Fix

## Issue
The `orders.user_id` field does **NOT** have a foreign key constraint, which means:
- No referential integrity enforcement
- Can insert invalid user_ids
- No automatic cleanup if a user is deleted

## Current Schema Issue

```sql
-- Current (INCORRECT):
CREATE TABLE public.orders (
  id UUID PRIMARY KEY,
  user_id UUID,  -- ❌ No foreign key constraint!
  ...
);
```

## Solution

Add foreign key constraint to reference `customers.uid`:

```sql
ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.customers(uid) 
ON DELETE SET NULL;
```

## Why `customers.uid` and not `profiles.uid`?

1. **Business Rule:**
   - Only customers can place orders
   - Support agents, sales managers, product managers should NOT be able to place orders
   - This enforces the business logic at the database level

2. **Schema Hierarchy:**
   - `auth.users(id)` ← Base authentication
   - `profiles(uid)` ← References `auth.users(id)` (all authenticated users)
   - `customers(uid)` ← References `profiles(uid)` (only customers)

3. **Data Integrity:**
   - Ensures orders can only be created by users who are in the `customers` table
   - Prevents support agents, sales managers, etc. from placing orders
   - More restrictive = better data integrity

## About `order_items`

**Note:** `order_items` table does **NOT** have a `user_id` field. It only has:
- `order_id` → References `orders(id)` ✅ (this is correct)
- `product_id` → References `products_belong_to(pid)` ✅ (this is correct)

The `user_id` is only in the `orders` table, which is the correct design.

## SQL Script

Run: `database/create_table_scripts/add_orders_foreign_key.sql`

## Before Running

Check for orphaned records (orders with user_ids that aren't customers):
```sql
SELECT DISTINCT o.user_id 
FROM orders o 
WHERE o.user_id IS NOT NULL 
AND o.user_id NOT IN (SELECT uid FROM customers);
```

If this returns any rows, you need to either:
1. Add those users to the `customers` table (if they should be customers)
2. Set those user_ids to NULL (if they're support agents/sales managers who shouldn't have orders)
3. Delete those orders (if they're invalid test data)

