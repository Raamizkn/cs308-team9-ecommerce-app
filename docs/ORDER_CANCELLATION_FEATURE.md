# Order Cancellation Feature (CG0-82)

## Overview

The Order Cancellation feature allows customers to cancel their orders that are in "pending" or "processing" status. The system automatically restores product stock and logs the cancellation for audit purposes.

---

## Features

### ✅ Customer Features
- **Cancel pending/processing orders** via order detail page
- **Confirmation dialog** to prevent accidental cancellations
- **Real-time feedback** on cancellation status
- **Stock restoration notification** after successful cancellation

### ✅ System Features
- **Automatic stock restoration** for all cancelled order items
- **Audit logging** of all cancellations with timestamps
- **Authorization checks** to ensure users can only cancel their own orders
- **Error handling** with detailed error messages
- **Transaction safety** with rollback capabilities

### ✅ Admin Features
- **Audit trail** of all cancellations via `order_cancellations` table
- **Stock restoration tracking** with error logging
- **Customer behavior analytics** for business insights

---

## Database Setup

### 1. Create the Stock Restoration Function

Run the following SQL script in your Supabase SQL Editor:

```sql
-- File: database/create_table_scripts/restore_stock_function.sql
```

This creates the `restore_stock()` function that safely increments product stock.

### 2. Create the Audit Table

Run this SQL to create the cancellation audit log:

```sql
-- File: database/create_table_scripts/order_cancellations_audit.sql
```

This creates the `order_cancellations` table to track all cancellation events.

---

## API Endpoints

### PATCH `/api/orders`

Cancels an existing order and restores product stock.

#### Request Body

```json
{
  "action": "cancel",
  "order_id": "uuid-of-order",
  "user_id": "uuid-of-user",
  "reason": "Optional cancellation reason"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order_id": "uuid-of-order",
  "stock_restored": true,
  "stock_restore_errors": null
}
```

#### Response (Error)

```json
{
  "error": "Cannot cancel order with status 'shipped'. Only orders in 'pending' or 'processing' status can be cancelled."
}
```

#### Status Codes

- `200` - Order cancelled successfully
- `400` - Invalid request (wrong status, missing fields)
- `403` - Unauthorized (user doesn't own the order)
- `404` - Order not found
- `500` - Internal server error

---

## Business Rules

### Cancellable Order Statuses
- ✅ **pending** - Order placed but not yet processed
- ✅ **processing** - Order being prepared for shipment
- ❌ **shipped** - Order already shipped (cannot cancel)
- ❌ **delivered** - Order delivered (use refund request instead)
- ❌ **cancelled** - Already cancelled

### Stock Restoration
When an order is cancelled:
1. Each product's `stock_quantity` is increased by the ordered quantity
2. Stock restoration happens immediately after status update
3. Errors are logged but don't prevent cancellation
4. Admin can review restoration errors in audit logs

### Authorization
- Users can only cancel their own orders
- System validates `user_id` matches `order.user_id`
- Admin roles can cancel any order (future enhancement)

---

## Frontend Implementation

### Order Detail Page

Location: `app/orders/[id]/page.tsx`

The order detail page shows a **CANCEL ORDER** button when:
- Order status is `pending` or `processing`
- User is authenticated and owns the order

#### User Flow

1. User clicks **CANCEL ORDER** button
2. Confirmation dialog appears with:
   - Warning message
   - Cancellation details (stock restoration, refund timeline)
   - Two options: **KEEP ORDER** or **YES, CANCEL**
3. User confirms cancellation
4. API request sent with loading state
5. Success toast notification displayed
6. Order detail page refreshes to show cancelled status

#### Code Example

```typescript
const handleCancelOrder = async () => {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const response = await fetch("/api/orders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      action: "cancel", 
      order_id: order.id,
      user_id: user?.id 
    }),
  })

  const data = await response.json()
  if (data.error) {
    // Show error toast
    return
  }

  // Show success toast
  // Refresh order details
}
```

---

## Audit Logging

All cancellations are logged in the `order_cancellations` table:

### Logged Information
- `order_id` - UUID of cancelled order
- `user_id` - UUID of user who cancelled
- `cancelled_at` - Timestamp of cancellation
- `order_total` - Total amount of cancelled order
- `items_count` - Number of items in order
- `stock_restored` - Boolean indicating successful stock restoration
- `stock_restore_errors` - JSON array of any errors
- `cancelled_by_role` - Role of person who cancelled (customer, admin, etc.)
- `cancellation_reason` - Optional reason provided

### Query Examples

```sql
-- View all cancellations in the last 30 days
SELECT * FROM order_cancellations
WHERE cancelled_at > NOW() - INTERVAL '30 days'
ORDER BY cancelled_at DESC;

-- Find cancellations with stock restoration errors
SELECT * FROM order_cancellations
WHERE stock_restored = false
AND stock_restore_errors IS NOT NULL;

-- Cancellation rate by day
SELECT 
  DATE(cancelled_at) as date,
  COUNT(*) as cancellations,
  SUM(order_total) as lost_revenue
FROM order_cancellations
GROUP BY DATE(cancelled_at)
ORDER BY date DESC;
```

---

## Testing

### Manual Testing Checklist

#### ✅ Happy Path
1. [ ] Create a test order with status "pending"
2. [ ] Navigate to order detail page
3. [ ] Click "CANCEL ORDER" button
4. [ ] Confirm cancellation in dialog
5. [ ] Verify order status changed to "cancelled"
6. [ ] Verify stock was restored for all items
7. [ ] Verify cancellation appears in audit log

#### ✅ Validation Tests
1. [ ] Try to cancel a "shipped" order (should fail)
2. [ ] Try to cancel a "delivered" order (should fail)
3. [ ] Try to cancel someone else's order (should fail - 403)
4. [ ] Try to cancel non-existent order (should fail - 404)
5. [ ] Try to cancel already cancelled order (should fail)

#### ✅ Stock Restoration Tests
1. [ ] Cancel order with multiple items
2. [ ] Verify stock increased for each product
3. [ ] Check product detail pages show correct stock
4. [ ] Verify items can be added to cart again

#### ✅ UI/UX Tests
1. [ ] Confirmation dialog displays correctly
2. [ ] Loading states work (button shows "CANCELLING...")
3. [ ] Success toast appears with correct message
4. [ ] Error toasts display helpful messages
5. [ ] Page refreshes to show updated order status

### Automated Testing (Future)

```typescript
// Example test cases
describe('Order Cancellation API', () => {
  test('should cancel pending order and restore stock', async () => {
    // Test implementation
  })

  test('should reject cancellation of shipped order', async () => {
    // Test implementation
  })

  test('should log cancellation to audit table', async () => {
    // Test implementation
  })
})
```

---

## Error Handling

### Stock Restoration Errors

If stock restoration fails for any item:
- Error is logged to `stock_restore_errors` field (JSON)
- Cancellation still succeeds
- Admin can manually adjust stock if needed
- User receives notification about partial restoration

### Example Error Log

```json
{
  "stock_restore_errors": [
    {
      "product_id": "123",
      "product_name": "Pixel Cat NFT",
      "error": "Product not found"
    }
  ]
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Order not found" | Invalid order_id | Verify order exists |
| "Unauthorized" | User doesn't own order | Check auth token |
| "Cannot cancel order" | Wrong order status | Check order status rules |
| "Missing required fields" | Invalid request body | Include action and order_id |

---

## Future Enhancements

### Phase 2 Features
- [ ] **Admin cancellation** - Allow support agents to cancel orders
- [ ] **Cancellation reasons** - Dropdown of predefined reasons
- [ ] **Partial cancellations** - Cancel individual items
- [ ] **Automatic refunds** - Trigger payment gateway refund
- [ ] **Email notifications** - Send cancellation confirmation email
- [ ] **Cancellation window** - Time limit after which cancellation isn't allowed

### Phase 3 Features
- [ ] **Analytics dashboard** - Visualize cancellation trends
- [ ] **Fraud detection** - Flag suspicious cancellation patterns
- [ ] **Inventory forecasting** - Use cancellation data for predictions
- [ ] **Customer retention** - Offer alternatives before cancellation

---

## Related Features

- **CG0-83**: Refunding orders (for delivered orders)
- **CG0-87**: Sales Manager Authorizing Refunds
- **CG0-88**: Notifying customer about refund
- **CG0-37**: Seeing invoice on screen

---

## Support & Troubleshooting

### Issue: Stock not restoring

**Check:**
1. Verify `restore_stock()` function exists in database
2. Check function permissions (GRANT EXECUTE)
3. Review server logs for error messages
4. Query `order_cancellations` table for `stock_restore_errors`

**Solution:**
```sql
-- Manually restore stock if needed
UPDATE products_belong_to
SET stock_quantity = stock_quantity + [quantity]
WHERE pid = [product_id];
```

### Issue: Cancellation button not showing

**Check:**
1. User is authenticated
2. Order status is "pending" or "processing"
3. Order belongs to current user
4. No JavaScript errors in browser console

### Issue: Audit logs not recording

**Check:**
1. Verify `order_cancellations` table exists
2. Check RLS policies allow INSERT
3. Review API server logs for audit errors
4. Ensure table schema matches expected columns

---

## Performance Considerations

- **Database indexes** on `order_id` and `user_id` for faster lookups
- **Stock updates** use atomic operations to prevent race conditions
- **Audit logging** doesn't block cancellation (fire-and-forget)
- **Query optimization** with proper JOIN strategies

---

## Security Considerations

- **Authorization** enforced at API level
- **Row Level Security** on audit table
- **SQL injection** prevented with parameterized queries
- **CSRF protection** via Next.js built-in middleware
- **Rate limiting** recommended for production (todo)

---

## Changelog

### v1.0.0 (2025-01-16)
- ✅ Initial implementation
- ✅ Stock restoration with `restore_stock()` function
- ✅ Audit logging with `order_cancellations` table
- ✅ Confirmation dialog UI
- ✅ Authorization checks
- ✅ Error handling and user feedback

---

## Contributors

- Backend API: Enhanced order cancellation endpoint
- Frontend UI: Confirmation dialog and user feedback
- Database: Stock restoration function and audit table
- Documentation: This comprehensive guide

---

## License

This feature is part of the PixelVault E-commerce Platform.
© 2025 Group9. All rights reserved.


