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

    // If user is authenticated, check if they have address and tax_id registered
    if (userId) {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("home_address, tax_id")
        .eq("uid", userId)
        .maybeSingle()

      if (customerError) {
        console.error("[Group9] Error checking customer data:", customerError)
      }

      if (customerData) {
        const missingFields: string[] = []
        if (!customerData.home_address || customerData.home_address.trim() === "" || customerData.home_address === "Not provided") {
          missingFields.push("address")
        }
        if (!customerData.tax_id || customerData.tax_id.trim() === "") {
          missingFields.push("Tax ID")
        }

        if (missingFields.length > 0) {
          return NextResponse.json(
            { 
              error: `Please register your ${missingFields.join(" and ")} from the profile page before placing an order.` 
            },
            { status: 400 }
          )
        }
      } else {
        // Customer record doesn't exist - they need to register
        return NextResponse.json(
          { 
            error: "Please register your address and Tax ID from the profile page before placing an order." 
          },
          { status: 400 }
        )
      }
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

    // Create order - try to store customer_name and customer_email from checkout form
    // These columns may not exist in older databases, so we handle errors gracefully
    const orderData: any = {
      user_id: userId,
      subtotal,
      tax_amount,
      total,
      shipping_address,
      payment_method,
      status: "processing",
    }
    
    // Try to add customer info if provided (columns may not exist)
    if (customer_name) {
      orderData.customer_name = customer_name
    }
    if (customer_email) {
      orderData.customer_email = customer_email
    }
    
    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single()
    
    // If insert failed due to missing columns, retry without customer_name/email
    if (orderError && (orderError.message?.includes("column") || orderError.code === "42703")) {
      console.log("[Group9] customer_name/email columns don't exist, retrying without them")
      const orderDataWithoutCustomer: any = {
        user_id: userId,
        subtotal,
        tax_amount,
        total,
        shipping_address,
        payment_method,
        status: "processing",
      }
      const retryResult = await supabase
        .from("orders")
        .insert(orderDataWithoutCustomer)
        .select()
        .single()
      order = retryResult.data
      orderError = retryResult.error
    }

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
    const { action, order_id, user_id } = body

    if (!action || !order_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Fetch order with order items
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, order_items(*, products_belong_to(*))")
      .eq("id", order_id)
      .single()

    if (fetchError || !order) {
      console.error("[Group9] Error fetching order:", fetchError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Authorization check - verify user owns this order (optional: allow admins to cancel any order)
    if (user_id && order.user_id && order.user_id !== user_id) {
      return NextResponse.json({ error: "Unauthorized: This order does not belong to you" }, { status: 403 })
    }

    if (action === "cancel") {
      // Validate order status - only allow cancellation of pending or processing orders
      const cancellableStatuses = ["pending", "processing"]
      if (!cancellableStatuses.includes(order.status)) {
        return NextResponse.json(
          {
            error: `Cannot cancel order with status "${order.status}". Only orders in "pending" or "processing" status can be cancelled.`,
          },
          { status: 400 },
        )
      }

      // Check if order was already cancelled
      if (order.status === "cancelled") {
        return NextResponse.json({ error: "This order has already been cancelled" }, { status: 400 })
      }

      // Begin transaction-like operations
      // 1. Update order status to cancelled
      const { error: updateError } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order_id)

      if (updateError) {
        console.error("[Group9] Error updating order status:", updateError)
        return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 })
      }

      // 2. Restore stock for all items in the order
      const stockRestoreErrors = []
      for (const item of order.order_items || []) {
        try {
          // Call the restore_stock function (we'll create this next)
          const { error: stockError } = await supabase.rpc("restore_stock", {
            product_id: item.product_id,
            quantity: item.quantity,
          })

          if (stockError) {
            console.error(`[Group9] Error restoring stock for product ${item.product_id}:`, stockError)
            stockRestoreErrors.push({
              product_id: item.product_id,
              product_name: item.products_belong_to?.name || "Unknown",
              error: stockError.message,
            })
          } else {
            console.log(
              `[Group9] Successfully restored ${item.quantity} units of product ${item.products_belong_to?.name || item.product_id}`,
            )
          }
        } catch (error) {
          console.error(`[Group9] Exception restoring stock for product ${item.product_id}:`, error)
          stockRestoreErrors.push({
            product_id: item.product_id,
            error: "Unexpected error",
          })
        }
      }

      // 3. Log the cancellation for audit purposes
      const cancellationLog = {
        order_id,
        user_id: order.user_id,
        cancelled_at: new Date().toISOString(),
        order_total: order.total,
        items_count: order.order_items?.length || 0,
        stock_restored: stockRestoreErrors.length === 0,
        stock_restore_errors: stockRestoreErrors.length > 0 ? JSON.stringify(stockRestoreErrors) : null,
        cancelled_by_role: "customer", // Determine role dynamically if needed
        cancellation_reason: body.reason || "User requested cancellation",
      }

      console.log("[Group9] Order cancelled:", cancellationLog)

      // Insert into order_cancellations audit table
      const { error: auditError } = await supabase.from("order_cancellations").insert(cancellationLog)

      if (auditError) {
        console.warn("[Group9] Failed to log cancellation to audit table:", auditError)
        // Don't fail the cancellation if audit logging fails
      }

      return NextResponse.json({
        success: true,
        message: "Order cancelled successfully",
        order_id,
        stock_restored: stockRestoreErrors.length === 0,
        stock_restore_errors: stockRestoreErrors.length > 0 ? stockRestoreErrors : undefined,
      })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
