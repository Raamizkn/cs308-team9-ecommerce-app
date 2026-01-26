import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Check if user is a customer (required for cart)
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("uid")
      .eq("uid", userId)
      .maybeSingle()

    if (customerError || !customerData) {
      // User is not a customer - can't have a cart
      return NextResponse.json({ error: "User is not a customer" }, { status: 403 })
    }

    // Get or create cart
    let { data: cartData, error: cartError } = await supabase
      .from("shopping_cart_assigned_to")
      .select("cart_id")
      .eq("uid", userId)
      .maybeSingle()

    let cartId: number

    if (cartError && cartError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error("[Group9] Error checking cart:", cartError)
      return NextResponse.json({ error: "Failed to check cart" }, { status: 500 })
    }

    if (!cartData) {
      // Create new cart
      const { data: newCart, error: createError } = await supabase
        .from("shopping_cart_assigned_to")
        .insert({ uid: userId })
        .select("cart_id")
        .single()

      if (createError || !newCart) {
        console.error("[Group9] Error creating cart:", createError)
        return NextResponse.json({ error: "Failed to create cart" }, { status: 500 })
      }

      cartId = newCart.cart_id
    } else {
      cartId = cartData.cart_id
    }

    // Clear existing cart items
    const { error: deleteError } = await supabase
      .from("contains_item")
      .delete()
      .eq("cart_id", cartId)

    if (deleteError) {
      console.error("[Group9] Error clearing cart items:", deleteError)
      return NextResponse.json({ error: "Failed to clear cart" }, { status: 500 })
    }

    // Insert new cart items
    if (items.length > 0) {
      const cartItems = items.map((item: any) => ({
        cart_id: cartId,
        pid: parseInt(item.product_id, 10),
        quantity: item.quantity || 1,
      }))

      const { error: insertError } = await supabase
        .from("contains_item")
        .insert(cartItems)

      if (insertError) {
        console.error("[Group9] Error syncing cart items:", insertError)
        return NextResponse.json({ error: "Failed to sync cart items" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, cartId })
  } catch (error) {
    console.error("[Group9] Unexpected error syncing cart:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

