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
    } else if (sort === "popularity") {
      // For popularity, we'll fetch all and sort by wishlist count in memory
      // since Supabase doesn't support sorting by aggregated counts easily
      query = query.order("name", { ascending: true })
    } else {
      query = query.order("name", { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      console.error("[Group9] Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If sorting by popularity, get wishlist counts
    let products = data?.map(product => ({
      ...product,
      id: product.pid,
      stock: product.stock_quantity,
      wishlist_count: 0,
      // Set image_url statically for specific products
      image_url: product.name === 'Time Turner Necklace' 
        ? '/time-turner-necklace.png' 
        : product.name === 'Drago Nova Transforming Bakugan'
        ? '/drago-nova-bakugan.png'
        : product.name === 'Elder Wand Replica'
        ? '/elder-wand-replica.png'
        : (product.image_url || '/placeholder.svg')
    }))

    if (sort === "popularity" && products) {
      // Get wishlist counts for all products
      const { data: wishlistData } = await supabase
        .from("wish_for")
        .select("pid")
      
      // Count wishlists per product
      const wishlistCounts: Record<number, number> = {}
      wishlistData?.forEach(item => {
        wishlistCounts[item.pid] = (wishlistCounts[item.pid] || 0) + 1
      })

      // Add counts and sort
      products = products.map(p => ({
        ...p,
        wishlist_count: wishlistCounts[p.pid] || 0
      })).sort((a, b) => b.wishlist_count - a.wishlist_count)
    }


    // Fetch discounts for all products
    if (products && products.length > 0) {
      const productIds = products.map(p => p.pid)
      
      // Get discount information
      const { data: discountData } = await supabase
        .from("applies_to")
        .select(`
          pid,
          discount_campaigns (
            did,
            rate
          )
        `)
        .in("pid", productIds)

      // Create discount map (pid -> highest discount rate)
      const discountMap: Record<number, { rate: number; campaign_id: number }> = {}
      discountData?.forEach((item: any) => {
        const rate = item.discount_campaigns?.rate || 0
        const did = item.discount_campaigns?.did
        
        // If product has multiple discounts, keep the highest
        if (!discountMap[item.pid] || discountMap[item.pid].rate < rate) {
          discountMap[item.pid] = { rate, campaign_id: did }
        }
      })

      // Add discount information to products
      products = products.map(p => ({
        ...p,
        discount_rate: discountMap[p.pid]?.rate || null,
        discount_campaign_id: discountMap[p.pid]?.campaign_id || null,
        discounted_price: discountMap[p.pid] 
          ? Number((p.price * (1 - discountMap[p.pid].rate)).toFixed(2))
          : null,
        has_discount: !!discountMap[p.pid]
      }))
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
