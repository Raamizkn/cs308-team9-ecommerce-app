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

  if (!n8nWebhookUrl) {
    console.error("[Group9] N8N_REFUND_APPROVAL_WEBHOOK_URL or N8N_WEBHOOK_URL environment variable is not set")
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

    console.log("[Group9] Sending refund approval email to:", data.userEmail, "for refund:", data.refundId)

    // Send to n8n webhook with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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
      console.error("[Group9] Error sending refund approval email:", errorText)
      return false
    }

    console.log("[Group9] Refund approval email sent successfully to:", data.userEmail)
    return true
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[Group9] Refund approval email webhook request timed out")
    } else {
      console.error("[Group9] Error sending refund approval email:", error)
    }
    return false
  }
}

