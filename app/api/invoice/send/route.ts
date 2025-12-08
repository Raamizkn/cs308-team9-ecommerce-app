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

    // Get customer information
    let customerName = customer_name || "Customer"
    let customerEmail = customer_email

    // If user_id exists, try to get more details
    if (order.user_id) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/users?user_id=${order.user_id}`)
        if (response.ok) {
          const userData = await response.json()
          if (userData.name) {
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

    // Calculate totals
    const subtotal = order.order_items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0
    const shipping = 10.00
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax

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

