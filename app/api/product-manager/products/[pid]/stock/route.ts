import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// PATCH - Update stock quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pid: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient()
    const { pid } = await params
    const productId = parseInt(pid)

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager
    const { data: pmData, error: pmError } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (pmError || !pmData) {
      return NextResponse.json({ error: "Forbidden: Product manager access required" }, { status: 403 })
    }

    const body = await request.json()
    const { adjustment, stock } = body

    // Validate input - either adjustment (relative) or stock (absolute) must be provided
    if (adjustment === undefined && stock === undefined) {
      return NextResponse.json(
        { error: "Either 'adjustment' (relative change) or 'stock' (absolute value) must be provided" },
        { status: 400 }
      )
    }

    // Get current product
    const { data: currentProduct, error: fetchError } = await supabase
      .from("products_belong_to")
      .select("stock_quantity")
      .eq("pid", productId)
      .single()

    if (fetchError) {
      console.error("[Group9] Error fetching product:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Calculate new stock value
    let newStock: number
    if (stock !== undefined) {
      // Absolute value
      newStock = Number(stock)
    } else {
      // Relative adjustment
      newStock = currentProduct.stock_quantity + Number(adjustment)
    }

    // Ensure stock is non-negative
    if (newStock < 0) {
      return NextResponse.json(
        { error: "Stock quantity cannot be negative" },
        { status: 400 }
      )
    }

    // Update stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from("products_belong_to")
      .update({ stock_quantity: newStock })
      .eq("pid", productId)
      .select("stock_quantity")
      .single()

    if (updateError) {
      console.error("[Group9] Error updating stock:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Stock updated successfully",
      stock: updatedProduct.stock_quantity,
    }, { status: 200 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

