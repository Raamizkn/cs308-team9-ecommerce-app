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
