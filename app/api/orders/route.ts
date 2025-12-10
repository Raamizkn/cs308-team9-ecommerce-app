import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, subtotal, tax_amount, total, shipping_address, payment_method, customer_email, customer_name } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get authenticated user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    const userId = user?.id || null

    if (userError) {
      console.error("[Group9] Error getting user:", userError)
    }

    if (!userId) {
      console.warn("[Group9] No authenticated user found - order will be created without user_id")
    } else {
      console.log("[Group9] Creating order for user:", userId)
    }

    // ===== CRITICAL: Validate stock availability BEFORE creating order =====
    console.log("[Group9] Validating stock availability for", items.length, "items")

    const stockValidationErrors: string[] = []

    for (const item of items) {
      const productId = parseInt(item.product_id, 10)

      // Fetch current stock from database
      const { data: product, error: productError } = await supabase
        .from("products_belong_to")
        .select("pid, name, stock_quantity")
        .eq("pid", productId)
        .single()

      if (productError || !product) {
        console.error("[Group9] Product not found:", productId, productError)
        stockValidationErrors.push(`Product with ID ${productId} not found`)
        continue
      }

      // Check if requested quantity exceeds available stock
      if (product.stock_quantity < item.quantity) {
        console.warn(
          `[Group9] Insufficient stock for product ${product.name} (ID: ${productId}). ` +
          `Requested: ${item.quantity}, Available: ${product.stock_quantity}`
        )

        if (product.stock_quantity === 0) {
          stockValidationErrors.push(`${product.name} is out of stock`)
        } else {
          stockValidationErrors.push(
            `${product.name}: Only ${product.stock_quantity} item(s) available (you requested ${item.quantity})`
          )
        }
      }
    }

    // If any stock validation errors, reject the order
    if (stockValidationErrors.length > 0) {
      console.error("[Group9] Order rejected due to insufficient stock:", stockValidationErrors)
      return NextResponse.json(
        {
          error: "Some items in your cart are out of stock or have insufficient quantity",
          details: stockValidationErrors,
        },
        { status: 400 }
      )
    }

    console.log("[Group9] Stock validation passed - proceeding with order creation")

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal,
        tax_amount,
        total,
        shipping_address,
        payment_method,
        status: "processing",
      })
      .select()
      .single()

    if (orderError) {
      console.error("[Group9] Error creating order:", orderError)
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: parseInt(item.product_id, 10), // Convert string to integer for products_belong_to.pid
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) {
      console.error("[Group9] Error creating order items:", itemsError)
      // Rollback: Delete the order since items failed
      await supabase.from("orders").delete().eq("id", order.id)
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 })
    }

    // Update product stock (now with proper error handling)
    console.log("[Group9] Decrementing stock for order:", order.id)

    for (const item of items) {
      const { error: stockError } = await supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        quantity: item.quantity,
      })

      if (stockError) {
        console.error("[Group9] Error updating stock:", stockError)
        // Note: At this point order is created but stock update failed
        // This is logged for manual intervention/monitoring
      }
    }

    // Send invoice email via n8n (attempt with timeout, but don't fail order)
    if (customer_email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      try {
        const invoiceResponse = await fetch(`${appUrl}/api/invoice/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            customer_email: customer_email,
            customer_name: customer_name || undefined,
          }),
          signal: controller.signal,
        })

        if (!invoiceResponse.ok) {
          const errorText = await invoiceResponse.text().catch(() => "Unknown error")
          console.error("[Group9] Invoice webhook responded with error:", errorText)
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.error("[Group9] Invoice webhook request timed out")
        } else {
          console.error("[Group9] Error triggering invoice email:", error)
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      message: "Order placed successfully",
    })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { action, order_id } = body

    if (!action || !order_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).single()
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (action === "cancel") {
      if (order.status !== "processing") {
        return NextResponse.json({ error: "Only processing orders can be cancelled" }, { status: 400 })
      }

      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order_id)
      if (error) {
        return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
