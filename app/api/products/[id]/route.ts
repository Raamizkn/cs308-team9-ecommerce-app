import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient()
    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("products_belong_to")
      .select("*, categories(name)")
      .eq("pid", productId)
      .single()

    if (error || !data) {
      console.error("[Group9] Error fetching product:", error)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch discount information for this product
    const { data: discountData } = await supabase
      .from("applies_to")
      .select(`
        pid,
        discount_campaigns (
          did,
          rate
        )
      `)
      .eq("pid", productId)

    // Find highest discount if multiple exist
    let highestDiscount: { rate: number; campaign_id: number } | null = null
    
    if (discountData && discountData.length > 0) {
      discountData.forEach((item: any) => {
        const rate = item.discount_campaigns?.rate || 0
        const did = item.discount_campaigns?.did
        
        if (!highestDiscount || highestDiscount.rate < rate) {
          highestDiscount = { rate, campaign_id: did }
        }
      })
    }

    // Add discount information to product
    const productWithDiscount = {
      ...data,
      discount_rate: highestDiscount?.rate || null,
      discount_campaign_id: highestDiscount?.campaign_id || null,
      discounted_price: highestDiscount 
        ? Number((data.price * (1 - highestDiscount.rate)).toFixed(2))
        : null,
      has_discount: !!highestDiscount
    }

    return NextResponse.json({ product: productWithDiscount })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

