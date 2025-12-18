import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    // Use service role key to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("[Group9] SUPABASE_SERVICE_ROLE_KEY is not set. Cannot fetch customer context.")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

    // Fetch recent orders
    const { data: orders, error: ordersError } = await adminSupabase
      .from("orders")
      .select("id, created_at, status, total_amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (ordersError) {
      console.error("[Group9] Error fetching orders:", ordersError)
    }

    // Fetch cart items - need to join through shopping_cart_assigned_to
    const { data: cartData, error: cartError } = await adminSupabase
      .from("shopping_cart_assigned_to")
      .select(`
        cart_id,
        contains_item (
          quantity,
          products_belong_to (
            pid,
            name,
            price,
            image_url
          )
        )
      `)
      .eq("uid", userId)
      .maybeSingle()

    let cartItems: any[] = []
    if (!cartError && cartData?.contains_item) {
      cartItems = cartData.contains_item.map((item: any) => ({
        quantity: item.quantity,
        products: item.products_belong_to,
      }))
    }

    // Fetch wishlist - fetch separately and combine since nested select might not work
    const { data: wishlistItems, error: wishlistError } = await adminSupabase
      .from("wish_for")
      .select("pid")
      .eq("uid", userId)

    let formattedWishlist: any[] = []
    if (!wishlistError && wishlistItems && wishlistItems.length > 0) {
      const pids = wishlistItems.map((item: any) => item.pid)
      const { data: products } = await adminSupabase
        .from("products_belong_to")
        .select("pid, name, price, image_url")
        .in("pid", pids)

      // Combine wishlist items with products
      formattedWishlist = wishlistItems.map((item: any) => {
        const product = products?.find((p: any) => p.pid === item.pid)
        return {
          products: product || null,
        }
      }).filter((item: any) => item.products !== null)
    }

    if (wishlistError) {
      console.error("[Group9] Error fetching wishlist:", wishlistError)
    }

    return NextResponse.json({
      orders: orders || [],
      cart: cartItems || [],
      wishlist: formattedWishlist || [],
    })
  } catch (error) {
    console.error("[Group9] Unexpected error in customer context route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

