# N8N Invoice Email Setup Guide

This guide explains how to set up n8n to automatically email invoice PDFs to customers when they place an order.

## Overview

When a customer places an order, the system will:
1. Generate an invoice PDF
2. Send the PDF data to an n8n webhook
3. n8n receives the webhook, processes the PDF, and emails it to the customer

## Prerequisites

- n8n installed and running (cloud or self-hosted)
- An email service configured in n8n (Gmail, SMTP, SendGrid, etc.)

## Step 1: Create n8n Workflow

### 1.1 Create a New Workflow

1. Open your n8n instance
2. Click **"New Workflow"**
3. Name it: `Send Invoice Email`

### 1.2 Add Webhook Node

1. Click **"Add Node"**
2. Search for **"Webhook"** and select it
3. Configure the webhook:
   - **HTTP Method**: `POST`
   - **Path**: `/invoice-email` (or any path you prefer)
   - **Response Mode**: `Respond When Last Node Finishes`
   - Click **"Listen for Test Event"** to get your webhook URL
4. **Copy the webhook URL** - you'll need this for the environment variable

### 1.3 Add Set Node (Optional - for data transformation)

1. Add a **"Set"** node after the Webhook
2. Configure it to extract data from the webhook payload:
   - **Keep Only Set Fields**: `false`
   - Add these fields:
     - `customerEmail`: `{{ $json.customerEmail }}`
     - `customerName`: `{{ $json.customerName }}`
     - `orderId`: `{{ $json.orderId }}`
     - `invoicePdf`: `{{ $json.invoicePdf }}`
     - `invoiceFileName`: `{{ $json.invoiceFileName }}`

### 1.4 Add Code Node (to convert base64 to buffer)

1. Add a **"Code"** node after the Set node
2. Select **JavaScript** as the language
3. Add this code:

```javascript
// Convert base64 PDF to buffer
const pdfBase64 = $input.item.json.invoicePdf;
const pdfBuffer = Buffer.from(pdfBase64, 'base64');

return {
  json: {
    customerEmail: $input.item.json.customerEmail,
    customerName: $input.item.json.customerName,
    orderId: $input.item.json.orderId,
    invoiceFileName: $input.item.json.invoiceFileName,
    pdfBuffer: pdfBuffer,
  }
};
```

### 1.5 Add Email Node

1. Add an **"Email"** node (or **"Gmail"**, **"SendGrid"**, etc. depending on your email service)
2. Configure the email:
   - **From Email**: Your store email (e.g., `noreply@pixelvault.com`)
   - **To Email**: `{{ $json.customerEmail }}`
   - **Subject**: `Your PixelVault Invoice - Order #{{ $json.orderId.substring(0, 8).toUpperCase() }}`
   - **Email Type**: `HTML`
   - **Message**: 
   ```html
   <html>
     <body>
       <h2>Thank you for your order!</h2>
       <p>Dear {{ $json.customerName }},</p>
       <p>Your order has been confirmed. Please find your invoice attached.</p>
       <p><strong>Order ID:</strong> {{ $json.orderId.substring(0, 8).toUpperCase() }}</p>
       <p>If you have any questions, please contact us at support@pixelvault.com</p>
       <p>Best regards,<br>The PixelVault Team</p>
     </body>
   </html>
   ```
   - **Attachments**: 
     - **Name**: `{{ $json.invoiceFileName }}`
     - **Data**: `{{ $json.pdfBuffer }}`
     - **Type**: `application/pdf`

### 1.6 Add Respond to Webhook Node

1. Add a **"Respond to Webhook"** node at the end
2. Configure:
   - **Response Code**: `200`
   - **Response Body**: `{ "success": true, "message": "Invoice email sent" }`

### 1.7 Activate the Workflow

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
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invoice-email
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### For Production

Add these to your hosting platform's environment variables:
- `N8N_WEBHOOK_URL`: Your n8n webhook URL
- `NEXT_PUBLIC_APP_URL`: Your production app URL (e.g., `https://yourdomain.com`)

## Step 3: Test the Integration

### 3.1 Test the Webhook Directly

You can test the n8n webhook using curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook/invoice-email \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "orderId": "test-order-123",
    "invoicePdf": "base64-encoded-pdf-here",
    "invoiceFileName": "test-invoice.pdf"
  }'
```

### 3.2 Test via Order Placement

1. Place a test order on your store
2. Check the n8n workflow execution logs
3. Verify the email was sent to the customer

## Workflow Diagram

```
┌─────────────┐
│   Webhook   │  Receives POST request with invoice data
└──────┬──────┘
       │
┌──────▼──────┐
│    Set     │  Extracts and structures data (optional)
└──────┬──────┘
       │
┌──────▼──────┐
│    Code    │  Converts base64 PDF to buffer
└──────┬──────┘
       │
┌──────▼──────┐
│   Email    │  Sends email with PDF attachment
└──────┬──────┘
       │
┌──────▼──────────┐
│ Respond to      │  Returns success response
│ Webhook         │
└─────────────────┘
```

## Alternative: Simplified Workflow (Without Code Node)

If your email service supports base64 attachments directly, you can skip the Code node:

1. **Webhook** → Receives data
2. **Set** → Extracts fields
3. **Email** → Use `invoicePdf` directly as base64 attachment
4. **Respond to Webhook** → Returns response

## Troubleshooting

### Email Not Sending

1. **Check n8n execution logs**: Go to "Executions" tab to see error details
2. **Verify webhook URL**: Make sure `N8N_WEBHOOK_URL` is correct in your `.env.local`
3. **Check email service credentials**: Ensure your email service (Gmail, SMTP, etc.) is properly configured in n8n
4. **Test webhook manually**: Use curl to test if the webhook is receiving data

### PDF Not Attaching

1. **Check base64 encoding**: The PDF should be properly base64 encoded
2. **Verify buffer conversion**: If using Code node, ensure the buffer conversion is correct
3. **Check email service limits**: Some email services have attachment size limits

### Order Created But No Email

1. **Check server logs**: Look for errors in the Next.js server console
2. **Verify customer_email**: Ensure the order has a valid customer email
3. **Check n8n workflow status**: Make sure the workflow is active
4. **Review API logs**: Check `/api/invoice/send` endpoint logs

## Security Considerations

1. **Webhook Authentication**: Consider adding authentication to your n8n webhook (API key, basic auth, etc.)
2. **HTTPS**: Always use HTTPS for webhook URLs in production
3. **Email Validation**: The system validates email format before sending
4. **Error Handling**: Email failures don't block order creation (non-blocking)

## Production Checklist

- [ ] n8n workflow is active and tested
- [ ] `N8N_WEBHOOK_URL` environment variable is set
- [ ] `NEXT_PUBLIC_APP_URL` is set to production URL
- [ ] Email service is configured and tested
- [ ] Webhook authentication is enabled (recommended)
- [ ] Error monitoring is set up for failed email sends

## Support

For issues or questions:
- Check n8n documentation: https://docs.n8n.io
- Review Next.js API route logs
- Check Supabase logs for order creation

