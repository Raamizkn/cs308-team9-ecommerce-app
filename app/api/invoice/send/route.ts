import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { renderToStream } from "@react-pdf/renderer"
import React from "react"
import { InvoicePDF } from "@/components/invoice-pdf"

interface InvoiceItem {
  id: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

interface InvoiceData {
  orderId: string
  orderDate: string
  customerName: string
  customerEmail: string
  shippingAddress: string
  items: InvoiceItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  paymentMethod: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, customer_email, customer_name } = body

    console.log("[Group9] /api/invoice/send invoked for order:", order_id)
    console.log("[Group9] Received customer_name from request:", customer_name)

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 })
    }

    if (!customer_email) {
      return NextResponse.json({ error: "customer_email is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Fetch order details with items and products
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*, products_belong_to(*))")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      console.error("[Group9] Error fetching order:", orderError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get customer information - prioritize checkout form name, then profiles table
    // The checkout form name is what the user explicitly entered, so it's most reliable
    let customerName = customer_name || "Customer"
    let customerEmail = customer_email

    // If checkout form didn't provide a name, try to get from profiles table
    if ((!customerName || customerName === "Customer" || customerName.trim() === "") && order.user_id) {
      try {
        // Try to get from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("uid", order.user_id)
          .maybeSingle()

        if (!profileError && profileData) {
          // Use profile name if it exists and is not empty/default
          if (profileData.name && profileData.name.trim() !== "" && profileData.name !== "User") {
            customerName = profileData.name
          }
          // Use profile email if it exists
          if (profileData.email) {
            customerEmail = profileData.email
          }
        } else {
          // Fallback: try API endpoint
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/users?user_id=${order.user_id}`)
            if (response.ok) {
              const userData = await response.json()
              if (userData.name && userData.name.trim() !== "" && userData.name !== "User") {
                customerName = userData.name
              }
              if (userData.email) {
                customerEmail = userData.email
              }
            }
          } catch (error) {
            console.error("[Group9] Error fetching user info:", error)
          }
        }
      } catch (error) {
        console.error("[Group9] Error fetching profile:", error)
      }
    }
    
    // Ensure we have a valid name - final fallback
    if (!customerName || customerName === "Customer" || customerName.trim() === "") {
      customerName = customer_name || "Customer"
    }
    
    console.log("[Group9] Invoice customer name:", customerName, "from checkout:", customer_name)

    // Use tax_amount and subtotal from order (already calculated and stored)
    const subtotal = order.subtotal || order.order_items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0
    const shipping = 0
    const tax = order.tax_amount || 0
    const total = order.total || subtotal + tax

    // Prepare invoice data
    const invoiceData: InvoiceData = {
      orderId: order.id,
      orderDate: order.created_at,
      customerName: customerName,
      customerEmail: customerEmail,
      shippingAddress: order.shipping_address || "N/A",
      items: order.order_items?.map((item: any) => ({
        id: item.id,
        product_name: item.products_belong_to?.name || "Product",
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })) || [],
      subtotal,
      shipping,
      tax,
      total,
      status: order.status,
      paymentMethod: order.payment_method || "Credit Card",
    }

    // Generate PDF stream and convert to buffer
    const pdfStream = await renderToStream(React.createElement(InvoicePDF, { data: invoiceData }))
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream) {
      chunks.push(chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)
    
    // Convert buffer to base64
    const pdfBase64 = pdfBuffer.toString("base64")

    // Get n8n webhook URL from environment variable
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error("[Group9] N8N_WEBHOOK_URL environment variable is not set")
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      )
    }

    // Send to n8n webhook
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerEmail: customerEmail,
        customerName: customerName,
        orderId: order.id,
        orderDate: order.created_at,
        invoicePdf: pdfBase64,
        invoiceFileName: `pixelvault-invoice-${order.id.substring(0, 8)}.pdf`,
      }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error("[Group9] Error sending to n8n webhook:", errorText)
      return NextResponse.json(
        { error: "Failed to send invoice email" },
        { status: 500 }
      )
    }

    console.log("[Group9] Invoice email sent successfully to:", customerEmail)

    return NextResponse.json({
      success: true,
      message: "Invoice email sent successfully",
    })
  } catch (error) {
    console.error("[Group9] Error sending invoice email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

