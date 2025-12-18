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
    // Using RPC function to bypass RLS (sales managers need to see all users' wishlists)
    console.log("[Group9] Looking for wishlist users with products:", product_ids)
    
    const { data: wishlistUsers, error: wishlistError } = await supabase
      .rpc("get_wishlist_users_for_products", { product_ids: product_ids })

    console.log("[Group9] Wishlist query result:", { wishlistUsers, wishlistError })

    let notifiedCount = 0

    if (!wishlistError && wishlistUsers && wishlistUsers.length > 0) {
      console.log("[Group9] Found", wishlistUsers.length, "wishlist entries to notify")
      // Get unique user IDs (RPC function returns user_id and product_id)
      const uniqueUserIds = [...new Set(wishlistUsers.map((w: any) => w.user_id))]

      // Create notifications for each user-product combination
      const notificationsToInsert = []

      for (const wishlistItem of wishlistUsers) {
        // Only create notification if the product_id matches one of the discounted products
        if (product_ids.includes(wishlistItem.product_id)) {
          notificationsToInsert.push({
            user_id: wishlistItem.user_id,
            product_id: wishlistItem.product_id,
            discount_id: campaign.did,
            discount_rate: rate,
            is_read: false,
          })
        }
      }

      // Insert notifications using RPC function to bypass RLS
      console.log("[Group9] Notifications to insert:", notificationsToInsert)
      
      if (notificationsToInsert.length > 0) {
        let successCount = 0
        for (const notification of notificationsToInsert) {
          const { data, error: notificationError } = await supabase.rpc("insert_discount_notification", {
            p_user_id: notification.user_id,
            p_product_id: notification.product_id,
            p_discount_id: notification.discount_id,
            p_discount_rate: notification.discount_rate,
          })

          if (notificationError) {
            console.error("[Group9] Error creating notification:", notificationError)
          } else {
            console.log("[Group9] Successfully created notification:", data)
            successCount++
          }
        }
        
        if (successCount > 0) {
          console.log("[Group9] Created", successCount, "notifications successfully")
          notifiedCount = uniqueUserIds.length
        }
      }
    } else {
      console.log("[Group9] No wishlist users found for these products - no notifications to send")
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

