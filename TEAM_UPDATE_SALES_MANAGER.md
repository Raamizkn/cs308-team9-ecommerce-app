# Sales Manager Dashboard Implementation - Team Update

**Date:** November 2024  
**Status:** Frontend Foundation Complete, Backend Integration Needed  
**Author:** Frontend Team

---

## ?? Executive Summary

This document outlines the implementation of the Sales Manager Dashboard frontend foundation, database security updates (RLS policies), and what remains to be completed for full functionality. The sales manager login and dashboard navigation are **fully functional**, but the individual feature pages require backend API integration.

---

## ??? Database Changes

### 1. Row Level Security (RLS) Policies Added

**File:** `database/rls_policies/rls_role_tables.sql`

**What Was Done:**
- Enabled RLS on role tables: `sales_managers`, `product_managers`, `support_agents`, `customers`
- Created SELECT policies allowing users to check their own role
- **Status:** ? **APPLIED TO PRODUCTION DATABASE**

**SQL Applied:**
```sql
ALTER TABLE public.sales_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check if they are a sales manager"
  ON public.sales_managers FOR SELECT
  USING (auth.uid() = uid);
-- (Similar policies for other role tables)
```

**Why This Matters:**
- Without these policies, role-checking queries would fail with "permission denied"
- Enables secure role-based authentication at the database level
- Users can only check their own role, preventing role enumeration attacks

**Action Required:** None - Already applied ?

---

### 2. Database Schema Reference

**Current Database Structure (for backend reference):**

**Role Tables:**
- `profiles` (uid, name) - Base user profiles
- `sales_managers` (uid) - References profiles.uid
- `product_managers` (uid) - References profiles.uid
- `support_agents` (uid) - References profiles.uid
- `customers` (uid, home_address, tax_id) - References profiles.uid

**Product Tables:**
- `categories` (cid, name)
- `products_belong_to` (pid, name, model, serial_number, description, price, stock_quantity, warranty_status, distributor_info, product_cost, cid)

**Order Tables:**
- `orders` (id, user_id, total, status, shipping_address, payment_method, created_at)
- `order_items` (id, order_id, product_id, quantity, price, created_at)

**Discount Tables:**
- `discount_campaigns` (did, rate) - Note: rate is NUMERIC(3,2) between 0 and 1
- `applies_to` (did, pid) - Links discounts to products

**Refund Tables:**
- `refund_requests` (id, order_id, user_id, reason, status, created_at)

**Note:** The database uses `products_belong_to` (not `products`) and `discount_campaigns.rate` (not `discount_percentage`). Ensure backend APIs match this schema.

---

## ?? Supabase Changes

### Authentication & Authorization

**What Was Done:**
1. ? RLS policies applied to role tables
2. ? Sales manager user added to database (`raamizkniazi@gmail.com`)
3. ? Login flow updated to check roles from database tables

**Current Sales Manager Users:**
- `raamizkniazi@gmail.com` - Active sales manager
- `salesmanager@example.com` - Test account (may need password reset)

**How Role Checking Works:**
```typescript
// After authentication, check sales_managers table
const { data } = await supabase
  .from("sales_managers")
  .select("uid")
  .eq("uid", authUser.id)
  .maybeSingle()
```

**Action Required:** 
- Backend team should verify RLS policies allow sales managers to:
  - Read all orders (for invoice viewing)
  - Update product prices
  - Create/manage discount campaigns
  - View refund requests

---

## ?? Frontend Features Implemented

### ? Completed Features

#### 1. Sales Manager Login Page
**Location:** `/app/sales-manager/login/page.tsx`

**Features:**
- Dedicated login page for sales managers
- Validates user is in `sales_managers` table
- Redirects to dashboard on success
- Shows error if user is not authorized

**Status:** ? **FULLY FUNCTIONAL**

#### 2. Sales Manager Dashboard
**Location:** `/app/sales-manager/dashboard/page.tsx`

**Features:**
- Protected route (checks sales manager role)
- Welcome message with user name
- Navigation cards for 6 main features:
  1. Pricing Management (`/sales-manager/pricing`)
  2. Discount Campaigns (`/sales-manager/discounts`)
  3. Invoices (`/sales-manager/invoices`)
  4. Revenue & Profit (`/sales-manager/revenue`)
  5. Order Overview (`/sales-manager/orders`)
  6. Refund Requests (`/sales-manager/refunds`)

**Status:** ? **FULLY FUNCTIONAL** (Navigation only - pages need implementation)

#### 3. Updated Regular Login
**Location:** `/app/login/page.tsx`

**Changes:**
- Now checks user role after login
- Auto-redirects sales managers to `/sales-manager/dashboard`
- Auto-redirects product managers/support agents to `/admin`
- Regular customers go to `/profile`

**Status:** ? **FULLY FUNCTIONAL**

#### 4. Helper Functions
**Location:** `/lib/user-role-helpers.ts`

**Functions Created:**
- `isSalesManager()` - Check if current user is sales manager
- `isProductManager()` - Check if current user is product manager
- `isSupportAgent()` - Check if current user is support agent
- `getUserRole()` - Get current user's role

**Status:** ? **READY TO USE** (Fixed bug: now uses `.maybeSingle()` instead of `.single()`)

---

## ?? Frontend Features NOT Yet Implemented

The following pages are **linked from the dashboard but don't exist yet**. They need to be created:

### 1. Pricing Management Page
**Route:** `/app/sales-manager/pricing/page.tsx`

**Required Features:**
- List all products with current prices
- Edit product prices (update `products_belong_to.price`)
- Bulk price updates
- Price history (if tracking needed)

**Backend API Needed:**
- `GET /api/sales-manager/products` - List products with prices
- `PATCH /api/sales-manager/products/[pid]/price` - Update product price
- (Optional) `POST /api/sales-manager/products/bulk-price` - Bulk update

**Database Tables:** `products_belong_to`

---

### 2. Discount Campaigns Page
**Route:** `/app/sales-manager/discounts/page.tsx`

**Required Features:**
- List all discount campaigns
- Create new discount campaign
- Apply discounts to selected products
- Set discount rate (0-100% or 0-1 decimal)
- Notify users with products in wishlist (when discount applied)

**Backend API Needed:**
- `GET /api/sales-manager/discounts` - List all campaigns
- `POST /api/sales-manager/discounts` - Create campaign
  ```json
  {
    "rate": 0.25,  // 25% discount
    "product_ids": [1, 2, 3]  // Products to apply to
  }
  ```
- `DELETE /api/sales-manager/discounts/[did]` - Delete campaign
- `POST /api/sales-manager/discounts/[did]/notify` - Notify wishlist users

**Database Tables:** `discount_campaigns`, `applies_to`, `wishlist` (for notifications)

**Note:** Current schema uses `rate` (0-1 decimal), not percentage. Frontend should convert for display.

---

### 3. Invoices Page
**Route:** `/app/sales-manager/invoices/page.tsx`

**Required Features:**
- Filter invoices by date range
- View invoice details (order items, customer info, totals)
- Print invoices
- Export invoices as PDF
- Download multiple invoices as ZIP

**Backend API Needed:**
- `GET /api/sales-manager/invoices?start_date=&end_date=` - Get invoices in date range
- `GET /api/sales-manager/invoices/[order_id]` - Get single invoice details
- `GET /api/sales-manager/invoices/[order_id]/pdf` - Generate PDF
- `POST /api/sales-manager/invoices/export` - Export multiple as ZIP

**Database Tables:** `orders`, `order_items`, `profiles` (for customer name)

**Note:** Invoices are essentially orders with formatted display. May need to create `invoices` table or use `orders` table.

---

### 4. Revenue & Profit Page
**Route:** `/app/sales-manager/revenue/page.tsx`

**Required Features:**
- Calculate revenue between date range
- Calculate profit/loss (revenue - cost)
- Display charts (revenue over time, profit margins)
- Export reports

**Backend API Needed:**
- `GET /api/sales-manager/revenue?start_date=&end_date=` - Calculate revenue
  ```json
  {
    "revenue": 15000.00,
    "cost": 7500.00,  // 50% of revenue (or from product_cost)
    "profit": 7500.00,
    "profit_margin": 0.50
  }
  ```
- `GET /api/sales-manager/revenue/chart?start_date=&end_date=` - Get chart data
  ```json
  {
    "daily_revenue": [
      {"date": "2024-11-01", "revenue": 500, "profit": 250},
      ...
    ]
  }
  ```

**Database Tables:** `orders`, `order_items`, `products_belong_to` (for product_cost)

**Calculation Logic:**
- Revenue = Sum of `orders.total` in date range
- Cost = Sum of (`order_items.quantity * products_belong_to.product_cost`)
- Profit = Revenue - Cost
- Default cost is 50% of sale price if `product_cost` not specified

---

### 5. Order Overview Page
**Route:** `/app/sales-manager/orders/page.tsx`

**Required Features:**
- View all orders (with filters)
- View order details
- Search orders
- Filter by status, date, customer

**Backend API Needed:**
- `GET /api/sales-manager/orders` - List all orders
- `GET /api/sales-manager/orders/[order_id]` - Get order details

**Database Tables:** `orders`, `order_items`, `products_belong_to`, `profiles`

**Note:** This might be similar to `/app/admin/orders/page.tsx` - can reuse components.

---

### 6. Refund Requests Page
**Route:** `/app/sales-manager/refunds/page.tsx`

**Required Features:**
- View all refund requests
- Approve/reject refund requests
- View refund details (order, customer, reason)
- Process refunds (update order status, add product back to stock)

**Backend API Needed:**
- `GET /api/sales-manager/refunds` - List refund requests
- `PATCH /api/sales-manager/refunds/[id]` - Approve/reject
  ```json
  {
    "status": "approved",  // or "rejected"
    "notes": "Refund processed"
  }
  ```
- `POST /api/sales-manager/refunds/[id]/process` - Process approved refund
  - Update `refund_requests.status`
  - Add products back to stock
  - Send email notification to customer

**Database Tables:** `refund_requests`, `orders`, `order_items`, `products_belong_to`

**Note:** There's already `/app/api/refunds/route.ts` - may need to extend it for sales manager access.

---

## ?? Backend API Requirements Summary

### New APIs Needed

1. **Pricing Management**
   - `GET /api/sales-manager/products` - List products with prices
   - `PATCH /api/sales-manager/products/[pid]/price` - Update price

2. **Discount Campaigns**
   - `GET /api/sales-manager/discounts` - List campaigns
   - `POST /api/sales-manager/discounts` - Create campaign
   - `DELETE /api/sales-manager/discounts/[did]` - Delete campaign
   - `POST /api/sales-manager/discounts/[did]/notify` - Notify wishlist users

3. **Invoices**
   - `GET /api/sales-manager/invoices` - List invoices (date range)
   - `GET /api/sales-manager/invoices/[order_id]/pdf` - Generate PDF

4. **Revenue & Profit**
   - `GET /api/sales-manager/revenue` - Calculate revenue/profit
   - `GET /api/sales-manager/revenue/chart` - Chart data

5. **Orders** (May reuse existing)
   - `GET /api/sales-manager/orders` - List all orders

6. **Refunds** (Extend existing)
   - `GET /api/sales-manager/refunds` - List refund requests
   - `PATCH /api/sales-manager/refunds/[id]` - Approve/reject
   - `POST /api/sales-manager/refunds/[id]/process` - Process refund

### RLS Policies Needed

Backend team should ensure sales managers can:
- ? Read from `sales_managers` table (already done)
- ?? Read all `orders` (need policy)
- ?? Update `products_belong_to.price` (need policy)
- ?? Insert/update `discount_campaigns` (need policy)
- ?? Insert/update `applies_to` (need policy)
- ?? Read/update `refund_requests` (need policy)

**Suggested RLS Policies:**
```sql
-- Sales managers can view all orders
CREATE POLICY "Sales managers can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.sales_managers WHERE uid = auth.uid())
  );

-- Sales managers can update product prices
CREATE POLICY "Sales managers can update product prices"
  ON public.products_belong_to FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.sales_managers WHERE uid = auth.uid())
  );

-- Sales managers can manage discount campaigns
CREATE POLICY "Sales managers can manage discount campaigns"
  ON public.discount_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sales_managers WHERE uid = auth.uid())
  );

-- Sales managers can manage refund requests
CREATE POLICY "Sales managers can manage refund requests"
  ON public.refund_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sales_managers WHERE uid = auth.uid())
  );
```

---

## ?? Bug Fixes Applied

1. **Fixed helper functions** - Changed `.single()` to `.maybeSingle()` to prevent errors when user doesn't have a role
2. **Fixed login redirect** - Now properly checks all role tables before redirecting

---

## ?? Testing Checklist

### Frontend Testing
- [x] Sales manager can login at `/sales-manager/login`
- [x] Sales manager redirected to dashboard after login
- [x] Regular login redirects sales managers correctly
- [x] Dashboard shows correct user name
- [x] Dashboard navigation links work (currently 404 - expected)
- [ ] Each feature page works after backend implementation

### Backend Testing Needed
- [ ] Sales manager can query orders
- [ ] Sales manager can update product prices
- [ ] Sales manager can create discount campaigns
- [ ] Sales manager can view invoices
- [ ] Sales manager can calculate revenue
- [ ] Sales manager can process refunds

---

## ?? Next Steps

### For Backend Team:
1. **Priority 1:** Create RLS policies for sales manager access (see above)
2. **Priority 2:** Implement pricing management APIs
3. **Priority 3:** Implement discount campaign APIs (with wishlist notification)
4. **Priority 4:** Implement invoice/revenue APIs
5. **Priority 5:** Extend refund APIs for sales manager access

### For Frontend Team:
1. **Priority 1:** Create pricing management page (`/sales-manager/pricing`)
2. **Priority 2:** Create discount campaigns page (`/sales-manager/discounts`)
3. **Priority 3:** Create invoices page (`/sales-manager/invoices`)
4. **Priority 4:** Create revenue & profit page (`/sales-manager/revenue`)
5. **Priority 5:** Create refund requests page (`/sales-manager/refunds`)

### For Full Integration:
1. Connect frontend pages to backend APIs
2. Add error handling and loading states
3. Add form validation
4. Add PDF generation for invoices
5. Add chart library for revenue visualization
6. Add email notifications for discount campaigns

---

## ?? Files Changed/Created

### New Files:
- `/app/sales-manager/login/page.tsx` - Sales manager login page
- `/app/sales-manager/dashboard/page.tsx` - Sales manager dashboard
- `/lib/user-role-helpers.ts` - Role checking helper functions
- `/database/rls_policies/rls_role_tables.sql` - RLS policies for role tables

### Modified Files:
- `/app/login/page.tsx` - Updated to check roles and redirect accordingly

### Documentation Files:
- `SALES_MANAGER_SETUP.md` - Setup instructions
- `QUICK_START_SALES_MANAGER.md` - Quick reference
- `database/rls_policies/README_RLS_AUTH.md` - RLS documentation
- `database/rls_policies/WHY_RLS_POLICIES_NEEDED.md` - RLS explanation

---

## ? Questions for Backend Team

1. **Invoice Table:** Do we need a separate `invoices` table, or can we use `orders` table for invoices?
2. **Product Cost:** Should we always use `product_cost` from `products_belong_to`, or default to 50% of price?
3. **Discount Notifications:** How should we notify wishlist users? Email? In-app notification? Both?
4. **PDF Generation:** What library should we use for PDF generation? (e.g., `pdfkit`, `puppeteer`, `jsPDF`)
5. **Chart Library:** What chart library should we use? (e.g., `recharts`, `chart.js`, `victory`)
6. **Date Ranges:** Should date range queries be inclusive or exclusive of end date?

---

## ?? Contact

For questions about frontend implementation, contact the frontend team lead.  
For database/RLS questions, refer to the SQL files in `/database/rls_policies/`.

---

**Last Updated:** November 2024  
**Status:** Foundation Complete, Backend Integration Pending
