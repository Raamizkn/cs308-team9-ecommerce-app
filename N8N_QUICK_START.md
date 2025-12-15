# n8n Quick Start Guide - Invoice Email Setup

Follow these steps to set up n8n to automatically email invoices to customers.

## Prerequisites

- n8n account (cloud at n8n.io or self-hosted)
- Email service ready (Gmail, SMTP, SendGrid, etc.)

---

## Step-by-Step Setup

### Step 1: Create New Workflow

1. Log into your n8n instance
2. Click **"Add Workflow"** or **"New Workflow"**
3. Name it: `Invoice Email Automation`

---

### Step 2: Add Webhook Trigger

1. Click the **"+"** button to add a node
2. Search for **"Webhook"** and select it
3. Configure:
   - **HTTP Method**: Select `POST`
   - **Path**: Type `/invoice-email` (or any name you want)
   - **Response Mode**: Select `Respond When Last Node Finishes`
4. Click **"Listen for Test Event"** button
5. **IMPORTANT**: Copy the webhook URL shown (e.g., `https://your-n8n.com/webhook/invoice-email`)
   - You'll need this URL for your `.env.local` file

---

### Step 3: Add Code Node (Convert PDF)

1. Click **"+"** after the Webhook node
2. Search for **"Code"** and select it
3. Select **JavaScript** as the language
4. Paste this code:

```javascript
// Get the incoming data
const data = $input.item.json;

// Convert base64 PDF to buffer
const pdfBase64 = data.invoicePdf;
const pdfBuffer = Buffer.from(pdfBase64, 'base64');

// Return formatted data
return {
  json: {
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    orderId: data.orderId,
    invoiceFileName: data.invoiceFileName,
    pdfBuffer: pdfBuffer
  }
};
```

5. Click **"Execute Node"** to test (it will use sample data)

---

### Step 4: Add Email Node

1. Click **"+"** after the Code node
2. Search for **"Email"** (or **"Gmail"**, **"SendGrid"** - depending on your email service)
3. Select your email service

#### If using Gmail:
- Click **"Connect"** and authorize Gmail
- **From Email**: Your Gmail address
- **To Email**: `{{ $json.customerEmail }}`
- **Subject**: `Your PixelVault Invoice - Order #{{ $json.orderId.substring(0, 8).toUpperCase() }}`
- **Email Type**: `HTML`
- **Message**: Paste this:

```html
<h2>Thank you for your order!</h2>
<p>Dear {{ $json.customerName }},</p>
<p>Your order has been confirmed. Please find your invoice attached.</p>
<p><strong>Order ID:</strong> {{ $json.orderId.substring(0, 8).toUpperCase() }}</p>
<p>If you have any questions, please contact us at support@pixelvault.com</p>
<p>Best regards,<br>The PixelVault Team</p>
```

- **Attachments**: Click **"Add Attachment"**
  - **Name**: `{{ $json.invoiceFileName }}`
  - **Data**: `{{ $json.pdfBuffer }}`
  - **Type**: `application/pdf`

#### If using SMTP/Generic Email:
- Configure your SMTP settings
- Use the same fields as above

---

### Step 5: Add Response Node

1. Click **"+"** after the Email node
2. Search for **"Respond to Webhook"** and select it
3. Configure:
   - **Response Code**: `200`
   - **Response Body**: Select `JSON`
   - **Response Body JSON**: 
   ```json
   {
     "success": true,
     "message": "Invoice email sent"
   }
   ```

---

### Step 6: Connect All Nodes

Your workflow should look like this:

```
[Webhook] → [Code] → [Email] → [Respond to Webhook]
```

Make sure all nodes are connected (drag from one node's output to the next node's input).

---

### Step 7: Save and Activate

1. Click **"Save"** button (top right)
2. Toggle the **"Active"** switch to ON (top right)
3. Your workflow is now live! 🎉

---

## Step 8: Configure Your App

Add the webhook URL to your `.env.local` file:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invoice-email
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Replace** `https://your-n8n-instance.com/webhook/invoice-email` with the actual webhook URL you copied in Step 2.

---

## Step 9: Test It!

1. Place a test order on your store
2. Check n8n → **"Executions"** tab to see if it ran
3. Check the customer's email inbox

---

## Visual Workflow Layout

```
┌─────────────────┐
│    Webhook      │  ← Receives invoice data from your app
│  (POST trigger) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Code        │  ← Converts base64 PDF to buffer
│  (JavaScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Email       │  ← Sends email with PDF attachment
│  (Gmail/SMTP)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Respond to      │  ← Returns success response
│ Webhook         │
└─────────────────┘
```

---

## Common Issues & Solutions

### ❌ "Webhook not receiving data"
- Make sure workflow is **Active** (toggle switch ON)
- Check webhook URL matches your `.env.local`
- Verify the path in webhook node matches the URL

### ❌ "Email not sending"
- Check email service credentials are correct
- Verify customer email address is valid
- Check n8n Executions tab for error messages

### ❌ "PDF not attaching"
- Make sure Code node is converting base64 correctly
- Check attachment size limits of your email service
- Verify `pdfBuffer` is being passed to Email node

### ❌ "Workflow not executing"
- Ensure workflow is saved AND active
- Check webhook URL is accessible (not localhost if app is deployed)
- Verify POST request is reaching n8n (check Executions tab)

---

## Quick Checklist

- [ ] Webhook node created and URL copied
- [ ] Code node added with conversion script
- [ ] Email node configured with your email service
- [ ] Respond to Webhook node added
- [ ] All nodes connected
- [ ] Workflow saved
- [ ] Workflow activated (toggle ON)
- [ ] Webhook URL added to `.env.local`
- [ ] Test order placed and email received

---

## Need Help?

- Check the full guide: `N8N_INVOICE_EMAIL_SETUP.md`
- n8n Documentation: https://docs.n8n.io
- Check n8n Executions tab for detailed error messages

