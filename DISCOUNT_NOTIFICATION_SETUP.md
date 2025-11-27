# Discount Notification Feature - Setup Guide

## 📋 What This Does

When a discount is applied to a product (via the `applies_to` table), **all users who have that product in their wishlist automatically receive a notification**.

---

## 🗄️ Database Setup (Run These 2 SQL Scripts)

### **Script 1: Create Notifications Table**

Go to: https://supabase.com/dashboard/project/kqrdykjrbyeocrmxmeji/sql/new

```sql
CREATE TABLE IF NOT EXISTS public.discount_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL REFERENCES public.products_belong_to(pid) ON DELETE CASCADE,
  discount_id INT NOT NULL REFERENCES public.discount_campaigns(did) ON DELETE CASCADE,
  discount_rate NUMERIC(3, 2) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id, discount_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_notifications_user_id ON public.discount_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_product_id ON public.discount_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_created_at ON public.discount_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discount_notifications_is_read ON public.discount_notifications(is_read);

ALTER TABLE public.discount_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON public.discount_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON public.discount_notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
  ON public.discount_notifications 
  FOR INSERT 
  WITH CHECK (true);
```

### **Script 2: Create Trigger Function**

```sql
CREATE OR REPLACE FUNCTION public.notify_wishlist_users_on_discount()
RETURNS TRIGGER AS $$
DECLARE
  wishlist_user RECORD;
  discount_rate_value NUMERIC(3, 2);
  product_pid_text TEXT;
BEGIN
  SELECT rate INTO discount_rate_value
  FROM public.discount_campaigns
  WHERE did = NEW.did;

  IF discount_rate_value IS NULL THEN
    RETURN NEW;
  END IF;

  product_pid_text := NEW.pid::TEXT;

  FOR wishlist_user IN
    SELECT DISTINCT w.user_id
    FROM public.wishlist w
    WHERE 
      (w.product_id::TEXT ~ '^[0-9]+$' AND w.product_id::INTEGER = NEW.pid)
      OR
      w.product_id::TEXT = product_pid_text
  LOOP
    INSERT INTO public.discount_notifications (
      user_id,
      product_id,
      discount_id,
      discount_rate,
      is_read
    )
    VALUES (
      wishlist_user.user_id,
      NEW.pid,
      NEW.did,
      discount_rate_value,
      FALSE
    )
    ON CONFLICT (user_id, product_id, discount_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_wishlist_on_discount ON public.applies_to;

CREATE TRIGGER trigger_notify_wishlist_on_discount
  AFTER INSERT ON public.applies_to
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wishlist_users_on_discount();
```

---

## ✅ What's Already Done

- ✅ Notification table SQL script created
- ✅ Trigger function SQL script created
- ✅ API endpoint (`/api/notifications`) created
- ✅ Frontend notification badge component created
- ✅ Notification badge added to header

---

## 🧪 How to Test

### **Step 1: Run the SQL Scripts**
Run both scripts above in Supabase SQL Editor.

### **Step 2: Add Product to Wishlist**
1. Log in to the website
2. Browse products
3. Add a product to your wishlist (via profile page)

### **Step 3: Apply Discount to Product**
Run this in Supabase SQL Editor:

```sql
-- First, create a discount campaign
INSERT INTO public.discount_campaigns (rate)
VALUES (0.20)  -- 20% discount
RETURNING did;

-- Note the did (discount ID) from above, then apply it to a product
-- Replace 1 with your product pid, and 1 with the discount did
INSERT INTO public.applies_to (did, pid)
VALUES (1, 1);  -- Apply discount ID 1 to product ID 1
```

### **Step 4: Check Notification**
1. Refresh the website
2. Look for the **bell icon** in the header (should show a red badge with "1")
3. Click the bell icon
4. You should see a notification about the discount!

---

## 📝 Files Created/Modified

### **Database Scripts:**
- `database/create_table_scripts/discount_notifications.sql`
- `database/create_table_scripts/discount_notification_trigger.sql`

### **Backend:**
- `app/api/notifications/route.ts` - GET and PATCH endpoints

### **Frontend:**
- `components/discount-notification-badge.tsx` - Notification UI component
- `components/pixel-header.tsx` - Added notification badge to header

---

## 🎯 How It Works

1. **Sales Manager applies discount** → Inserts row into `applies_to` table
2. **Database trigger fires** → `notify_wishlist_users_on_discount()` function runs
3. **Function finds wishlist users** → Queries all users who have that product
4. **Notifications created** → Inserts into `discount_notifications` table
5. **User sees notification** → Bell icon in header shows unread count
6. **User clicks bell** → Sees list of discount notifications
7. **User clicks notification** → Marks as read, goes to product page

---

## ⚠️ Important Notes

- The trigger only fires when a **NEW** discount is applied (INSERT into `applies_to`)
- If a discount already exists and you want to notify users, you'd need to delete and re-insert it
- Notifications are unique per user/product/discount combination (prevents duplicates)
- The wishlist table structure needs to match - if your wishlist uses UUID product_id, the trigger might need adjustment

---

**Ready to test! Run the 2 SQL scripts and try applying a discount to a wishlist product!** 🚀

