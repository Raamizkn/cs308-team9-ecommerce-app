import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// DELETE - Remove a product
export async function DELETE(
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

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products_belong_to")
      .select("pid")
      .eq("pid", productId)
      .maybeSingle()

    if (fetchError) {
      console.error("[Group9] Error fetching product:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Delete the product
    const { error: deleteError } = await supabase
      .from("products_belong_to")
      .delete()
      .eq("pid", productId)

    if (deleteError) {
      console.error("[Group9] Error deleting product:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

