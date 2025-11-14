import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, user_id, reason } = body

    if (!order_id || !user_id || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Check if order exists and belongs to user
    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).eq("user_id", user_id).single()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Only allow refunds for delivered orders
    if (order.status !== "delivered") {
      return NextResponse.json({ error: "Refunds are allowed only for delivered orders" }, { status: 400 })
    }

    // Check if refund request already exists
    const { data: existingRefund } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("order_id", order_id)
      .single()

    if (existingRefund) {
      return NextResponse.json({ error: "Refund request already exists for this order" }, { status: 400 })
    }

    // Create refund request
    const { data, error } = await supabase
      .from("refund_requests")
      .insert({
        order_id,
        user_id,
        reason,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("[Group9] Error creating refund request:", error)
      return NextResponse.json({ error: "Failed to create refund request" }, { status: 500 })
    }

    return NextResponse.json({ success: true, refund_request: data })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    const supabase = await getSupabaseServerClient()

    let query = supabase.from("refund_requests").select("*, orders(*)")

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[Group9] Error fetching refund requests:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ refund_requests: data })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
