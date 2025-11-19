import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, total, shipping_address, payment_method, customer_email, customer_name } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // For demo purposes, create a guest user or use existing
    // In production, this would use authenticated user
    const userId = null

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total,
        shipping_address,
        payment_method,
        status: "pending",
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
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) {
      console.error("[Group9] Error creating order items:", itemsError)
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 })
    }

    // Update product stock
    for (const item of items) {
      const { error: stockError } = await supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        quantity: item.quantity,
      })

      if (stockError) {
        console.error("[Group9] Error updating stock:", stockError)
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
