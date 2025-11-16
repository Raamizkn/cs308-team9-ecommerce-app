import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const sort = searchParams.get("sort") || "created_at"

    let query = supabase.from("products_belong_to").select("*, categories(name)")

    // Filter by category
    if (category) {
        const { data: allCategories } = await supabase.from("categories").select("cid, name")
        const categoryData = allCategories?.find(c => c.name.toLowerCase().replace(/ /g, '-') === category)

        if (categoryData) {
            query = query.eq("cid", categoryData.cid)
        }
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Sorting
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true })
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false })
    } else {
      query = query.order("name", { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      console.error("[Group9] Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map database fields to frontend expected fields
    const products = data?.map(product => ({
      ...product,
      id: product.pid,
      stock: product.stock_quantity
    }))

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
