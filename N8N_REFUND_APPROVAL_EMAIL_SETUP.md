# N8N Refund Approval Email Setup Guide

This guide explains how to set up n8n to automatically email customers when their refund request is approved.

## Overview

When a sales manager approves a refund request, the system will:
1. Fetch refund details (amount, product, order info)
2. Send the refund data to an n8n webhook
3. n8n receives the webhook, processes the data, and emails the customer

## Prerequisites

- n8n installed and running (cloud or self-hosted)
- An email service configured in n8n (Gmail, SMTP, SendGrid, etc.)
- Existing n8n workflow for invoice emails (optional - can reuse same email service)

## Step 1: Create n8n Workflow

### 1.1 Create a New Workflow

1. Open your n8n instance
2. Click **"New Workflow"**
3. Name it: `Send Refund Approval Email`

### 1.2 Add Webhook Node

1. Click **"Add Node"**
2. Search for **"Webhook"** and select it
3. Configure the webhook:
   - **HTTP Method**: `POST`
   - **Path**: `/refund-approval-email` (or any path you prefer)
   - **Response Mode**: `Respond When Last Node Finishes`
   - Click **"Listen for Test Event"** to get your webhook URL
4. **Copy the webhook URL** - you'll need this for the environment variable

### 1.3 Add Set Node (Optional - for data transformation)

1. Add a **"Set"** node after the Webhook
2. Configure it to extract data from the webhook payload:
   - **Keep Only Set Fields**: `false`
   - Add these fields:
     - `customerEmail`: `{{ $json.userEmail }}`
     - `customerName`: `{{ $json.userName }}`
     - `refundId`: `{{ $json.refundId }}`
     - `orderId`: `{{ $json.orderId }}`
     - `productName`: `{{ $json.productName }}`
     - `refundAmount`: `{{ $json.refundAmountFormatted }}`
     - `quantity`: `{{ $json.quantity }}`
     - `orderDate`: `{{ $json.orderDate }}`

### 1.4 Add Email Node

1. Add an **"Email"** node (or **"Gmail"**, **"SendGrid"**, etc. depending on your email service)
2. Configure the email:
   - **From Email**: Your store email (e.g., `noreply@pixelvault.com`)
   - **To Email**: `{{ $json.customerEmail }}`
   - **Subject**: `Refund Approved - Order #{{ $json.orderId.substring(0, 8).toUpperCase() }}`
   - **Email Type**: `HTML`
   - **Message**: 
   ```html
   <html>
     <body>
       <h2>Your Refund Has Been Approved</h2>
       <p>Dear {{ $json.customerName }},</p>
       <p>We're pleased to inform you that your refund request has been approved.</p>
       
       <div style="background-color: #f8f9fa; padding: 15px; border: 2px solid #5b3a8f; margin: 20px 0;">
         <h3>Refund Details:</h3>
         <p><strong>Order ID:</strong> {{ $json.orderId.substring(0, 8).toUpperCase() }}</p>
         <p><strong>Product:</strong> {{ $json.productName }}</p>
         <p><strong>Quantity:</strong> {{ $json.quantity }}</p>
         <p><strong>Refund Amount:</strong> ${{ $json.refundAmountFormatted }}</p>
         <p><strong>Refund ID:</strong> {{ $json.refundId.substring(0, 8).toUpperCase() }}</p>
       </div>
       
       <p>The refunded amount will be credited back to your original payment method within 5-10 business days.</p>
       
       <p>If you have any questions, please contact us at support@pixelvault.com</p>
       <p>Best regards,<br>The PixelVault Team</p>
     </body>
   </html>
   ```

#### If using Gmail:
- Configure Gmail credentials
- Use the same fields as above

#### If using SMTP/Generic Email:
- Configure your SMTP settings
- Use the same fields as above

### 1.5 Add Respond to Webhook Node

1. Add a **"Respond to Webhook"** node at the end
2. Configure:
   - **Response Code**: `200`
   - **Response Body**: `{ "success": true, "message": "Refund approval email sent" }`

### 1.6 Activate the Workflow

1. Click **"Save"** to save the workflow
2. Toggle the **"Active"** switch to activate it
3. The webhook is now ready to receive requests

## Step 2: Configure Environment Variables

Add the n8n webhook URL to your environment variables:

### For Local Development

Create or update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
N8N_REFUND_APPROVAL_WEBHOOK_URL=https://your-n8n-instance.com/webhook/refund-approval-email
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invoice-email  # Fallback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### For Production (Vercel)

Add to Vercel environment variables:
- `N8N_REFUND_APPROVAL_WEBHOOK_URL` = Your refund approval webhook URL
- `N8N_WEBHOOK_URL` = Your invoice webhook URL (fallback)

## Step 3: Test the System

1. **As Sales Manager:**
   - Login to `/sales-manager/refunds`
   - Approve a refund request
   - Check n8n → **"Executions"** tab to see if it ran
   - Check the customer's email inbox

2. **Verify Email Content:**
   - Email should include refund amount, product name, order ID
   - Email should be sent to the correct customer email

## Webhook Payload Structure

The webhook receives the following JSON payload:

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

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables:**
   - Verify `N8N_REFUND_APPROVAL_WEBHOOK_URL` is set correctly
   - Check that the webhook URL is accessible

2. **Check n8n Workflow:**
   - Ensure workflow is **Active**
   - Check **"Executions"** tab for errors
   - Verify webhook path matches your URL

3. **Check API Logs:**
   - Look for `[Group9]` log messages in your server logs
   - Check for "Error sending refund approval email" messages

4. **Verify Customer Email:**
   - The system only sends emails if customer email is found in `auth.users`
   - Check logs for "Skipping refund approval email - customer email not found"

### Common Issues

- **Webhook timeout**: Increase timeout in `sendRefundApprovalEmail.ts` (currently 10 seconds)
- **Email service not configured**: Ensure email node in n8n has valid credentials
- **Customer email missing**: Customer must have an email in `auth.users` table

## Notes

- Emails are sent asynchronously (non-blocking)
- If email sending fails, the refund approval still succeeds
- The system logs all email attempts for debugging
- Refund amount includes any discounts that were applied at purchase time

