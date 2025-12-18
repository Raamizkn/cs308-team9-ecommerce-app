import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Get user's discount notifications
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch notifications
    const { data: notifications, error } = await supabase
      .from("discount_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      // If table doesn't exist yet, return empty array instead of error
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.log("[Group9] discount_notifications table not found - returning empty array")
        return NextResponse.json({ notifications: [] })
      }
      console.error("[Group9] Error fetching notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch product details for each notification
    const notificationsWithProducts = await Promise.all(
      (notifications || []).map(async (notification) => {
        // Convert product_id to INTEGER if it's stored as string
        const productId = typeof notification.product_id === 'string' 
          ? parseInt(notification.product_id, 10) 
          : notification.product_id

        const { data: product, error: productError } = await supabase
          .from("products_belong_to")
          .select("name, price, image_url")
          .eq("pid", productId)
          .single()

        if (productError) {
          console.error(`[Group9] Error fetching product ${productId}:`, productError)
        }

        const { data: discount, error: discountError } = await supabase
          .from("discount_campaigns")
          .select("rate")
          .eq("did", notification.discount_id)
          .single()

        if (discountError) {
          console.error(`[Group9] Error fetching discount ${notification.discount_id}:`, discountError)
        }

        return {
          ...notification,
          products_belong_to: product || null,
          discount_campaigns: discount || null,
        }
      })
    )

    return NextResponse.json({ notifications: notificationsWithProducts || [] })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Mark notification as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { notification_id, mark_all_read } = body

    const supabase = await getSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (mark_all_read) {
      // Mark all user's notifications as read
      const { error } = await supabase
        .from("discount_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        // If table doesn't exist yet, just return success
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, message: "All notifications marked as read" })
        }
        console.error("[Group9] Error marking all as read:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "All notifications marked as read" })
    }

    if (!notification_id) {
      return NextResponse.json({ error: "notification_id is required" }, { status: 400 })
    }

    // Mark single notification as read
    const { error } = await supabase
      .from("discount_notifications")
      .update({ is_read: true })
      .eq("id", notification_id)
      .eq("user_id", user.id) // Ensure user owns this notification

    if (error) {
      // If table doesn't exist yet, just return success
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ success: true })
      }
      console.error("[Group9] Error marking notification as read:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

