/**
 * Sends a refund approval email via n8n webhook when a refund request is approved
 */

interface RefundApprovalEmailData {
  userEmail: string
  userName: string
  refundId: string
  orderId: string
  productName: string
  refundAmount: number
  quantity: number
  orderDate: string
}

export async function sendRefundApprovalEmail(data: RefundApprovalEmailData): Promise<boolean> {
  const n8nWebhookUrl = process.env.N8N_REFUND_APPROVAL_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL

  console.log(`[Group9] sendRefundApprovalEmail called - webhook URL set: ${!!n8nWebhookUrl}`)
  console.log(`[Group9] Using webhook URL: ${n8nWebhookUrl || 'NOT SET'}`)

  if (!n8nWebhookUrl) {
    console.error("[Group9] ❌ N8N_REFUND_APPROVAL_WEBHOOK_URL or N8N_WEBHOOK_URL environment variable is not set")
    return false
  }

  try {
    const webhookPayload = {
      userEmail: data.userEmail,
      userName: data.userName,
      refundId: data.refundId,
      orderId: data.orderId,
      productName: data.productName,
      refundAmount: data.refundAmount,
      refundAmountFormatted: data.refundAmount.toFixed(2),
      quantity: data.quantity,
      orderDate: data.orderDate,
      alertType: "refund_approval",
      timestamp: new Date().toISOString(),
    }

    console.log("[Group9] 📧 Sending refund approval email to:", data.userEmail, "for refund:", data.refundId)
    console.log("[Group9] Webhook URL:", n8nWebhookUrl)
    console.log("[Group9] Webhook payload:", JSON.stringify(webhookPayload, null, 2))

    // Send to n8n webhook with longer timeout (30 seconds to match invoice processing time)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.error("[Group9] ⏱️ Webhook timeout triggered after 30 seconds")
      controller.abort()
    }, 30000) // 30 second timeout (increased from 10 seconds)

    try {
      const webhookResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error(`[Group9] ❌ Webhook returned error status ${webhookResponse.status}:`, errorText)
        return false
      }

      const responseText = await webhookResponse.text()
      console.log(`[Group9] ✅ Webhook responded successfully (${webhookResponse.status}):`, responseText.substring(0, 200))
      console.log("[Group9] ✅ Refund approval email sent successfully to:", data.userEmail)
      return true
    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError // Re-throw to be caught by outer catch
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[Group9] ❌ Refund approval email webhook request timed out after 30 seconds")
      console.error("[Group9] This might indicate n8n webhook is slow or unresponsive")
    } else {
      console.error("[Group9] ❌ Error sending refund approval email:", error)
      if (error instanceof Error) {
        console.error("[Group9] Error details:", error.message)
        console.error("[Group9] Error stack:", error.stack)
      }
    }
    return false
  }
}

