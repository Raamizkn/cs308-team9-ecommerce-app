import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Create a discount campaign and notify wishlist users
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a sales manager
    const { data: salesManager, error: roleError } = await supabase
      .from("sales_managers")
      .select("uid")
      .eq("uid", user.id)
      .single()

    if (roleError || !salesManager) {
      return NextResponse.json({ error: "Forbidden: Sales manager access required" }, { status: 403 })
    }

    const body = await request.json()
    const { rate, product_ids } = body

    // Validation
    if (!rate || typeof rate !== "number" || rate <= 0 || rate > 1) {
      return NextResponse.json({ error: "Invalid discount rate. Must be between 0 and 1" }, { status: 400 })
    }

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "At least one product ID is required" }, { status: 400 })
    }

    // Create discount campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("discount_campaigns")
      .insert({
        rate: rate,
      })
      .select()
      .single()

    if (campaignError) {
      console.error("[Group9] Error creating campaign:", campaignError)
      return NextResponse.json({ error: campaignError.message }, { status: 500 })
    }

    // Apply discount to products using the RPC function
    const { error: applyError } = await supabase.rpc("apply_discount_to_products", {
      target_did: campaign.did,
      target_pids: product_ids,
    })

    if (applyError) {
      console.error("[Group9] Error applying discount:", applyError)
      return NextResponse.json({ error: applyError.message }, { status: 500 })
    }

    // Get users who have these products in their wishlist
    // Convert product_ids to TEXT for comparison (wishlist.product_id is TEXT)
    const productIdsAsText = product_ids.map((id: number) => id.toString())

    const { data: wishlistUsers, error: wishlistError } = await supabase
      .from("wishlist")
      .select("user_id, product_id")
      .in("product_id", productIdsAsText)

    let notifiedCount = 0

    if (!wishlistError && wishlistUsers && wishlistUsers.length > 0) {
      // Get unique user IDs
      const uniqueUserIds = [...new Set(wishlistUsers.map((w) => w.user_id))]

      // Create notifications for each user-product combination
      const notificationsToInsert = []

      for (const wishlistItem of wishlistUsers) {
        // Only create notification if the product_id matches one of the discounted products
        const productIdInt = parseInt(wishlistItem.product_id, 10)
        if (product_ids.includes(productIdInt)) {
          notificationsToInsert.push({
            user_id: wishlistItem.user_id,
            product_id: productIdInt,
            discount_id: campaign.did,
            discount_rate: rate,
            is_read: false,
          })
        }
      }

      // Insert notifications in batch
      if (notificationsToInsert.length > 0) {
        const { error: notificationError } = await supabase
          .from("discount_notifications")
          .insert(notificationsToInsert)
          .select()

        if (notificationError) {
          // If table doesn't exist yet, just log and continue (don't fail the request)
          if (notificationError.code === "42P01" || notificationError.message?.includes("does not exist")) {
            console.log("[Group9] discount_notifications table not found - skipping notification creation")
          } else {
            console.error("[Group9] Error creating notifications:", notificationError)
          }
          // Don't fail the request if notifications fail, just log it
        } else {
          notifiedCount = uniqueUserIds.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign: {
        did: campaign.did,
        rate: campaign.rate,
      },
      products_count: product_ids.length,
      notified_users_count: notifiedCount,
    })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

