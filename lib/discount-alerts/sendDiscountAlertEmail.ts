/**
 * Sends a discount alert email via n8n webhook when a user's wishlist item goes on discount
 */

interface DiscountAlertEmailData {
  userEmail: string
  userName: string
  productId: number
  productName: string
  productPrice: number
  discountRate: number
  discountId: number
}

export async function sendDiscountAlertEmail(data: DiscountAlertEmailData): Promise<boolean> {
  const n8nWebhookUrl = process.env.N8N_DISCOUNT_ALERT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL

  if (!n8nWebhookUrl) {
    console.error("[Group9] N8N_DISCOUNT_ALERT_WEBHOOK_URL or N8N_WEBHOOK_URL environment variable is not set")
    return false
  }

  try {
    const discountPercentage = Math.round(data.discountRate * 100)
    const discountedPrice = data.productPrice * (1 - data.discountRate)

    const webhookPayload = {
      userEmail: data.userEmail,
      userName: data.userName,
      productId: data.productId,
      productName: data.productName,
      productPrice: data.productPrice,
      discountRate: data.discountRate,
      discountPercentage: discountPercentage,
      discountedPrice: discountedPrice.toFixed(2),
      discountId: data.discountId,
      alertType: "discount_alert",
      timestamp: new Date().toISOString(),
    }

    console.log("[Group9] Sending discount alert email to:", data.userEmail, "for product:", data.productName)

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
      console.error("[Group9] Error sending discount alert email:", errorText)
      return false
    }

    console.log("[Group9] Discount alert email sent successfully to:", data.userEmail)
    return true
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[Group9] Discount alert email webhook request timed out")
    } else {
      console.error("[Group9] Error sending discount alert email:", error)
    }
    return false
  }
}

