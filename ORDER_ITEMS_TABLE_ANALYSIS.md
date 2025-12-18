# Order Items Table Analysis

## Question
Should `order_items` table use a UUID `id` primary key or a composite primary key `(order_id, product_id)`?

## Analysis Results

### Current Usage of `order_items.id`:

1. **React Key Prop Only** (`app/orders/[id]/page.tsx:298`)
   - `key={item.id}` - Can be replaced with `${item.order_id}-${item.product_id}`

2. **No Database Queries by ID**
   - All queries use `order_items(*)` or join via `order_id`
   - No `.eq("id", ...)` filters on order_items

3. **No Updates/Deletes by ID**
   - No operations target individual order items by their id
   - Order items are only created or deleted via cascade when order is deleted

4. **Inserts Don't Specify ID**
   - Code relies on auto-generation, which works fine with composite keys

## Conclusion

✅ **The `id` field is NOT required for core functionality.**

The table can be safely changed to use a composite primary key `(order_id, product_id)` as your friend suggested.

## Required Code Changes

If you change to composite key, update this one line:

**File:** `app/orders/[id]/page.tsx` (line 298)
```tsx
// Change from:
<div key={item.id} className="...">

// To:
<div key={`${item.order_id}-${item.product_id}`} className="...">
```

## New Table Schema

```sql
CREATE TABLE IF NOT EXISTS public.order_items (
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products_belong_to(pid),
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (order_id, product_id)
);
```

## Note

This assumes that the same product cannot appear multiple times in the same order (which matches typical e-commerce behavior where adding the same product again just updates quantity).

