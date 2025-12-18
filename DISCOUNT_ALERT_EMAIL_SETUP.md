# Discount Alert Email Setup Guide

This guide explains how to set up automatic email notifications when wishlist items go on discount.

## Overview

When a discount is applied to a product, users who have that product in their wishlist will:
1. Receive an in-app notification (bell icon)
2. Receive an email alert via n8n webhook

## Prerequisites

- n8n workflow configured for discount alert emails
- Environment variable `N8N_DISCOUNT_ALERT_WEBHOOK_URL` set (or `N8N_WEBHOOK_URL` as fallback)

## Step 1: Create n8n Workflow for Discount Alerts

### 1.1 Create a New Workflow

1. Open your n8n instance
2. Click **"New Workflow"**
3. Name it: `Discount Alert Emails`

### 1.2 Add Webhook Node

1. Click **"Add Node"**
2. Search for **"Webhook"** and select it
3. Configure the webhook:
   - **HTTP Method**: `POST`
   - **Path**: `/discount-alert` (or any path you prefer)
   - **Response Mode**: `Respond When Last Node Finishes`
   - Click **"Listen for Test Event"** to get your webhook URL
4. **Copy the webhook URL** - you'll need this for the environment variable

### 1.3 Add Email Node

1. Add an **"Email"** node (or **"Gmail"**, **"SendGrid"**, etc.)
2. Configure the email:
   - **From Email**: Your store email (e.g., `noreply@pixelvault.com`)
   - **To Email**: `{{ $json.userEmail }}`
   - **Subject**: `🎉 {{ $json.discountPercentage }}% OFF: {{ $json.productName }}`
   - **Email Type**: `HTML`
   - **Message**: 
   ```html
   <html>
     <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
       <h2 style="color: #5b3a8f;">Great News, {{ $json.userName }}! 🎉</h2>
       <p>An item on your wishlist is now on sale!</p>
       <div style="background-color: #fff3cd; border: 2px solid #ff6b9d; padding: 20px; margin: 20px 0; border-radius: 8px;">
         <h3 style="margin-top: 0; color: #5b3a8f;">{{ $json.productName }}</h3>
         <p style="font-size: 24px; font-weight: bold; color: #ff6b9d;">
           {{ $json.discountPercentage }}% OFF
         </p>
         <p style="text-decoration: line-through; color: #6c757d;">
           Was ${{ $json.productPrice }}
         </p>
         <p style="font-size: 20px; font-weight: bold; color: #5b3a8f;">
           Now ${{ $json.discountedPrice }}
         </p>
       </div>
       <p>
         <a href="{{ $json.productUrl || 'https://your-store.com/catalog?product=' + $json.productId }}" 
            style="background-color: #5b3a8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
           View Product
         </a>
       </p>
       <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
         This discount alert was sent because you have this item in your wishlist.
       </p>
       <p style="color: #6c757d; font-size: 12px;">
         If you have any questions, please contact us at support@pixelvault.com
       </p>
       <p style="color: #6c757d; font-size: 12px;">
         Best regards,<br>The PixelVault Team
       </p>
     </body>
   </html>
   ```

### 1.4 Add Respond to Webhook Node

1. Add a **"Respond to Webhook"** node at the end
2. Configure:
   - **Response Code**: `200`
   - **Response Body**: `{ "success": true, "message": "Discount alert email sent" }`

### 1.5 Activate the Workflow

1. Click **"Save"** to save the workflow
2. Toggle the **"Active"** switch to activate it

## Step 2: Configure Environment Variables

Add the n8n webhook URL to your environment variables:

### For Local Development

Create or update `.env.local`:

```env
N8N_DISCOUNT_ALERT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/discount-alert
# OR use the same webhook as invoices:
# N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invoice-email
```

### For Production

Add to your hosting platform's environment variables:
- `N8N_DISCOUNT_ALERT_WEBHOOK_URL`: Your n8n discount alert webhook URL
- `N8N_WEBHOOK_URL`: (Optional fallback) Your n8n webhook URL

## Step 3: Webhook Payload Structure

The webhook will receive the following JSON payload:

```json
{
  "userEmail": "customer@example.com",
  "userName": "John Doe",
  "productId": 123,
  "productName": "Charizard Card",
  "productPrice": 29.99,
  "discountRate": 0.20,
  "discountPercentage": 20,
  "discountedPrice": "23.99",
  "discountId": 5,
  "alertType": "discount_alert",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## How It Works

### Method 1: Sales Manager Creates Discount (Application Layer)

When a sales manager creates a discount via `/api/sales-manager/discounts`:
1. Discount is applied to products
2. Notifications are created in the database
3. **Emails are sent immediately** via n8n webhook
4. User receives both in-app notification and email

### Method 2: Database Trigger (Requires pg_net)

If you want emails to be sent even when discounts are applied directly to the database:

1. **Enable pg_net extension** in Supabase:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. **Set your app URL** in database settings:
   ```sql
   ALTER DATABASE postgres SET app.settings.app_url = 'https://your-app-url.com';
   ```

3. **Update the trigger function** by running:
   ```sql
   -- See: database/create_table_scripts/discount_notification_trigger_with_email.sql
   ```

4. The trigger will automatically call `/api/discount-alerts/send-email` when notifications are created

**Note**: Method 1 (application layer) is recommended as it's simpler and doesn't require pg_net extension.

## Testing

### Test via Sales Manager Dashboard

1. Log in as a sales manager
2. Go to `/sales-manager/discounts`
3. Create a discount for a product
4. Check n8n → **"Executions"** tab to see if the webhook was called
5. Check the customer's email inbox

### Test the API Endpoint Directly

```bash
curl -X POST https://your-app-url.com/api/discount-alerts/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "product_id": 1,
    "discount_id": 1,
    "discount_rate": 0.20
  }'
```

## Troubleshooting

### Emails Not Sending

1. **Check environment variable**: Ensure `N8N_DISCOUNT_ALERT_WEBHOOK_URL` is set correctly
2. **Check n8n workflow**: Verify the workflow is active and check execution logs
3. **Check user email**: Ensure user has an email in their profile
4. **Check server logs**: Look for errors in Next.js server console

### Database Trigger Not Sending Emails

1. **Check pg_net extension**: Ensure `pg_net` is enabled in Supabase
2. **Check app URL**: Verify `app.settings.app_url` is set correctly
3. **Check API endpoint**: Test `/api/discount-alerts/send-email` directly
4. **Check trigger**: Verify the trigger function is updated and active

### User Email Missing

- Users need to have an email in their `profiles` table
- If email is only in `auth.users`, you may need to sync it to profiles
- Check the profile creation/update logic

## Files Created/Modified

### New Files:
- `lib/discount-alerts/sendDiscountAlertEmail.ts` - Email sending utility
- `app/api/discount-alerts/send-email/route.ts` - API endpoint for trigger
- `database/create_table_scripts/discount_notification_trigger_with_email.sql` - Updated trigger (optional)

### Modified Files:
- `app/api/sales-manager/discounts/route.ts` - Now sends emails when creating discounts

## Security Considerations

1. **Webhook Authentication**: Consider adding authentication to your n8n webhook (API key, basic auth, etc.)
2. **HTTPS**: Always use HTTPS for webhook URLs in production
3. **Email Validation**: The system validates email format before sending
4. **Error Handling**: Email failures don't block discount creation (non-blocking)

## Production Checklist

- [ ] n8n workflow is active and tested
- [ ] `N8N_DISCOUNT_ALERT_WEBHOOK_URL` environment variable is set
- [ ] Email service is configured and tested
- [ ] Webhook authentication is enabled (recommended)
- [ ] Error monitoring is set up for failed email sends
- [ ] User profiles have email addresses populated

## Support

For issues or questions:
- Check n8n documentation: https://docs.n8n.io
- Review Next.js API route logs
- Check Supabase logs for notification creation

