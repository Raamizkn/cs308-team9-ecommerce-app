# Refund Approval Email Implementation - Complete

## ✅ Implementation Summary

Refund approval email notifications have been fully implemented via n8n webhook integration.

---

## 📁 Files Created/Modified

### 1. New Helper Function
**File:** `lib/refunds/sendRefundApprovalEmail.ts`
- Sends refund approval emails via n8n webhook
- Handles timeouts and errors gracefully
- Returns boolean indicating success/failure

### 2. Updated API Endpoint
**File:** `app/api/refunds/[id]/decision/route.ts`
- Fetches refund request details before processing
- Fetches customer email from `auth.users` using admin client
- Sends email notification when refund is approved
- Email sending is asynchronous (non-blocking)

### 3. Documentation
**File:** `N8N_REFUND_APPROVAL_EMAIL_SETUP.md`
- Complete setup guide for n8n workflow
- Webhook payload structure
- Troubleshooting guide

---

## 🔌 How It Works

### Flow:

1. **Sales Manager Approves Refund**
   - Sales manager clicks "Approve" on `/sales-manager/refunds`
   - Frontend calls `POST /api/refunds/{id}/decision` with `{ decision: "approve" }`

2. **API Processes Refund**
   - Validates user is sales manager
   - Fetches refund request with order/product details
   - Calls `approve_refund_request` RPC function
   - Updates refund status to "approved"
   - Restores product stock

3. **Email Notification**
   - Fetches customer email from `auth.users` (using admin client)
   - Fetches customer name from `profiles` table
   - Calculates refund amount (price × quantity)
   - Sends webhook to n8n with refund details
   - Email is sent asynchronously (doesn't block refund approval)

---

## 📧 Email Content

The email includes:
- Customer name and email
- Refund ID
- Order ID
- Product name
- Quantity refunded
- Refund amount (formatted)
- Order date
- Message about refund processing time

---

## 🔧 Setup Instructions

### 1. Create n8n Workflow

Follow the guide in `N8N_REFUND_APPROVAL_EMAIL_SETUP.md`:
- Create webhook node
- Add email node
- Configure email template
- Activate workflow

### 2. Configure Environment Variables

Add to `.env.local` (or Vercel environment variables):

```env
N8N_REFUND_APPROVAL_WEBHOOK_URL=https://your-n8n-instance.com/webhook/refund-approval-email
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invoice-email  # Fallback
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for fetching customer emails
```

### 3. Test

1. Create a refund request (as customer)
2. Approve the refund (as sales manager)
3. Check n8n executions tab
4. Verify email is received

---

## 📊 Webhook Payload

```json
{
  "userEmail": "customer@example.com",
  "userName": "John Doe",
  "refundId": "uuid-of-refund-request",
  "orderId": "uuid-of-order",
  "productName": "Charizard Card",
  "refundAmount": 29.99,
  "refundAmountFormatted": "29.99",
  "quantity": 1,
  "orderDate": "2024-01-15T10:30:00.000Z",
  "alertType": "refund_approval",
  "timestamp": "2024-01-20T14:30:00.000Z"
}
```

---

## ✅ Requirements Met

- ✅ Refund approval triggers email notification
- ✅ Email includes refund amount
- ✅ Email includes product and order details
- ✅ Email sent to customer's email address
- ✅ Non-blocking (refund approval succeeds even if email fails)
- ✅ Error handling and logging

---

## 🐛 Error Handling

- If customer email is not found: Logs warning, refund still approved
- If webhook fails: Logs error, refund still approved
- If webhook times out: Logs timeout, refund still approved
- All errors are logged with `[Group9]` prefix for easy debugging

---

## 📝 Notes

- Email sending is asynchronous and non-blocking
- Refund approval succeeds even if email fails
- Customer email is fetched from `auth.users` table (requires admin client)
- Refund amount calculation includes any discounts applied at purchase time
- The system uses the same n8n infrastructure as invoice emails

---

## 🎯 Status

**Requirement #16 - Refund Approval Email: ✅ COMPLETE (8%)**

This completes the refund approval email requirement. The system now:
1. ✅ Processes refund approvals
2. ✅ Restores product stock
3. ✅ **Sends email notification to customer** ← NEW
4. ✅ Includes refund amount and details

