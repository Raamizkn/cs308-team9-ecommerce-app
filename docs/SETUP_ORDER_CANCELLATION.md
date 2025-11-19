# Quick Setup Guide: Order Cancellation Feature

## 🚀 5-Minute Setup

Follow these steps to enable the order cancellation feature in your PixelVault store.

---

## Step 1: Run Database Scripts

Open your **Supabase Dashboard** → **SQL Editor** and run these scripts **in order**:

### 1.1 Create Stock Restoration Function

```sql
-- Function to safely restore product stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.restore_stock(
  product_id INTEGER,
  quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  IF quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  UPDATE public.products_belong_to
  SET stock_quantity = stock_quantity + quantity
  WHERE pid = product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with pid % not found', product_id;
  END IF;

  RAISE NOTICE 'Restored % units to product ID %', quantity, product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.restore_stock(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_stock(INTEGER, INTEGER) TO anon;
```

### 1.2 Create Order Cancellations Audit Table

```sql
-- Tracks all order cancellations for audit purposes
CREATE TABLE IF NOT EXISTS public.order_cancellations (
  cancellation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancellation_reason TEXT,
  order_total NUMERIC(10, 2),
  items_count INTEGER,
  stock_restored BOOLEAN DEFAULT TRUE,
  stock_restore_errors JSONB,
  cancelled_by_role TEXT CHECK (cancelled_by_role IN ('customer', 'sales_manager', 'product_manager', 'support_agent', 'system')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_cancellations_order_id ON public.order_cancellations(order_id);
CREATE INDEX idx_order_cancellations_user_id ON public.order_cancellations(user_id);
CREATE INDEX idx_order_cancellations_cancelled_at ON public.order_cancellations(cancelled_at DESC);

ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cancellations" 
  ON public.order_cancellations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cancellations" 
  ON public.order_cancellations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.uid = auth.uid() 
      AND profiles.role IN ('sales_manager', 'product_manager', 'support_agent')
    )
  );

CREATE POLICY "System can insert cancellations" 
  ON public.order_cancellations 
  FOR INSERT 
  WITH CHECK (true);
```

---

## Step 2: Verify Installation

Run this query to test the setup:

```sql
-- Test the restore_stock function
SELECT restore_stock(1, 5);  -- Replace 1 with a valid product ID

-- Verify audit table exists
SELECT * FROM order_cancellations LIMIT 1;
```

You should see:
- ✅ "Restored 5 units to product ID 1" message
- ✅ Empty result set from cancellations table (or existing records)

---

## Step 3: Test the Feature

### 3.1 Start Development Server

```bash
npm run dev
```

### 3.2 Create a Test Order

1. Add items to cart
2. Go through checkout
3. Place an order
4. Note the order ID

### 3.3 Cancel the Order

1. Navigate to **My Orders** page
2. Click on the test order
3. Click **CANCEL ORDER** button
4. Confirm cancellation in dialog
5. Verify:
   - Order status shows "CANCELLED"
   - Success toast appears
   - Stock is restored (check product page)

### 3.4 Verify Audit Log

In Supabase SQL Editor:

```sql
SELECT 
  order_id,
  cancelled_at,
  order_total,
  stock_restored,
  cancellation_reason
FROM order_cancellations
ORDER BY cancelled_at DESC
LIMIT 10;
```

You should see your test cancellation logged.

---

## Step 4: Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
```

### Deploy Steps

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

---

## Troubleshooting

### Issue: "Function restore_stock does not exist"

**Solution:** Re-run Step 1.1 SQL script

### Issue: "Permission denied for table order_cancellations"

**Solution:** Check RLS policies were created correctly:

```sql
-- View existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'order_cancellations';
```

### Issue: Stock not restoring

**Solution:** Check product_id type matches (INTEGER vs UUID)

```sql
-- Verify your product table structure
\d products_belong_to
```

If using UUID instead of INTEGER, modify the function:

```sql
CREATE OR REPLACE FUNCTION public.restore_stock(
  product_id UUID,  -- Change to UUID
  quantity INTEGER
)
-- ... rest of function
```

---

## Next Steps

Now that order cancellation is working:

1. ✅ **Test thoroughly** with different scenarios
2. ✅ **Monitor audit logs** for any issues
3. ✅ **Set up email notifications** (optional)
4. ✅ **Implement refund processing** (CG0-83)
5. ✅ **Create admin analytics dashboard**

---

## Support

If you encounter any issues:

1. Check the full documentation: `docs/ORDER_CANCELLATION_FEATURE.md`
2. Review server logs: `npm run dev` console
3. Check Supabase logs: Dashboard → Logs
4. Verify database schema matches expected structure

---

## Quick Commands Cheatsheet

```bash
# Start dev server
npm run dev

# Check for linting errors
npm run lint

# Build for production
npm run build

# View database schema
# (Run in Supabase SQL Editor)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## Files Modified/Created

### Backend
- ✅ `app/api/orders/route.ts` - Enhanced PATCH endpoint
- ✅ `database/create_table_scripts/restore_stock_function.sql` - New
- ✅ `database/create_table_scripts/order_cancellations_audit.sql` - New

### Frontend
- ✅ `app/orders/[id]/page.tsx` - Added confirmation dialog

### Documentation
- ✅ `docs/ORDER_CANCELLATION_FEATURE.md` - Comprehensive docs
- ✅ `docs/SETUP_ORDER_CANCELLATION.md` - This guide

---

**🎉 Setup Complete!**

Your order cancellation feature is now ready to use.


