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

    // Fetch recent orders - include order_items for better context
    const { data: orders, error: ordersError } = await adminSupabase
      .from("orders")
      .select(`
        id,
        created_at,
        status,
        total,
        subtotal,
        tax_amount,
        order_items (
          id,
          quantity,
          price,
          products_belong_to (
            pid,
            name,
            price,
            image_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (ordersError) {
      console.error("[Group9] Error fetching orders:", ordersError)
      console.error("[Group9] Orders error details:", JSON.stringify(ordersError, null, 2))
    } else {
      console.log(`[Group9] Fetched ${orders?.length || 0} orders for user ${userId}`)
    }

    // Fetch cart items - need to join through shopping_cart_assigned_to
    // First check if cart exists
    const { data: cartExists, error: cartCheckError } = await adminSupabase
      .from("shopping_cart_assigned_to")
      .select("cart_id")
      .eq("uid", userId)
      .maybeSingle()

    let cartItems: any[] = []
    
    if (cartCheckError && cartCheckError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error("[Group9] Error checking cart existence:", cartCheckError)
    } else if (cartExists?.cart_id) {
      // Cart exists, fetch items
      const { data: cartItemsData, error: cartItemsError } = await adminSupabase
        .from("contains_item")
        .select(`
          quantity,
          pid,
          products_belong_to (
            pid,
            name,
            price,
            image_url
          )
        `)
        .eq("cart_id", cartExists.cart_id)

      if (cartItemsError) {
        console.error("[Group9] Error fetching cart items:", cartItemsError)
        console.error("[Group9] Cart items error details:", JSON.stringify(cartItemsError, null, 2))
      } else if (cartItemsData && cartItemsData.length > 0) {
        cartItems = cartItemsData.map((item: any) => ({
          quantity: item.quantity,
          pid: item.pid,
          products: item.products_belong_to, // Use 'products' (plural) to match frontend expectation
        }))
        console.log(`[Group9] Fetched ${cartItems.length} cart items for user ${userId}`)
      } else {
        console.log(`[Group9] Cart exists but is empty for user ${userId}`)
      }
    } else {
      console.log(`[Group9] No cart found for user ${userId} (cart may be in localStorage only)`)
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

    // Format orders to include total_amount alias for backward compatibility
    const formattedOrders = (orders || []).map((order: any) => ({
      ...order,
      total_amount: order.total, // Add alias for frontend compatibility
    }))

    return NextResponse.json({
      orders: formattedOrders,
      cart: cartItems || [],
      wishlist: formattedWishlist || [],
    })
  } catch (error) {
    console.error("[Group9] Unexpected error in customer context route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

