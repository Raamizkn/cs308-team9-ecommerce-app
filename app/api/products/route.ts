import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const sort = searchParams.get("sort") || "created_at"
    
    console.log("[Group9] API called with sort:", sort)

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

    // Map products with initial data
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

    // Always fetch wishlist counts (needed for popularity sorting)
    // Use service role key to bypass RLS since wishlist counts are public data
    let wishlistCounts: Record<number, number> = {}
    if (products && products.length > 0) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const wishlistClient = serviceRoleKey
        ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
        : supabase // Fallback to regular client if service role key not available
      
      const { data: wishlistData, error: wishlistError } = await wishlistClient
        .from("wish_for")
        .select("pid")
      
      if (wishlistError) {
        console.error("[Group9] Error fetching wishlist data:", wishlistError)
      }
      
      console.log("[Group9] Raw wishlist data:", wishlistData)
      
      // Count wishlists per product
      wishlistData?.forEach(item => {
        wishlistCounts[item.pid] = (wishlistCounts[item.pid] || 0) + 1
      })

      console.log("[Group9] Wishlist counts map:", wishlistCounts)

      // Add wishlist counts to all products
      products = products.map(p => ({
        ...p,
        wishlist_count: wishlistCounts[p.pid] || 0
      }))
      
      console.log("[Group9] Products after adding wishlist counts:", 
        products.map(p => ({ name: p.name, pid: p.pid, wishlist_count: p.wishlist_count }))
      )
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

      // Add discount information to products (preserve wishlist_count)
      products = products.map(p => ({
        ...p,
        wishlist_count: p.wishlist_count || 0, // Explicitly preserve wishlist_count
        discount_rate: discountMap[p.pid]?.rate || null,
        discount_campaign_id: discountMap[p.pid]?.campaign_id || null,
        discounted_price: discountMap[p.pid] 
          ? Number((p.price * (1 - discountMap[p.pid].rate)).toFixed(2))
          : null,
        has_discount: !!discountMap[p.pid]
      }))
    }

    // Fetch ratings from reviews table for all products
    if (products && products.length > 0) {
      const productIds = products.map(p => p.pid)
      
      // Get all reviews with ratings (ratings are always visible, comments need approval)
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("product_id, rating, status")
        .in("product_id", productIds)
      
      // Calculate average ratings per product
      const ratingMap: Record<number, { avgRating: number; reviewCount: number }> = {}
      
      reviewsData?.forEach((review: any) => {
        const pid = review.product_id
        // Only count reviews that have ratings (rating is not null)
        if (review.rating && review.rating > 0) {
          if (!ratingMap[pid]) {
            ratingMap[pid] = { avgRating: 0, reviewCount: 0 }
          }
          // Count all reviews with ratings (ratings are always visible)
          ratingMap[pid].reviewCount++
          ratingMap[pid].avgRating += review.rating
        }
      })
      
      // Calculate averages and add to products
      Object.keys(ratingMap).forEach(pid => {
        const pidNum = parseInt(pid, 10)
        const data = ratingMap[pidNum]
        ratingMap[pidNum].avgRating = data.reviewCount > 0 
          ? data.avgRating / data.reviewCount 
          : 0
      })
      
      // Add rating information to products (preserve wishlist_count)
      products = products.map(p => ({
        ...p,
        wishlist_count: p.wishlist_count || 0, // Explicitly preserve wishlist_count
        rating: ratingMap[p.pid]?.avgRating || 0,
        review_count: ratingMap[p.pid]?.reviewCount || 0
      }))
    }

    // Sort by discounted price if price sorting is requested
    if ((sort === "price_asc" || sort === "price_desc") && products) {
      products = products.sort((a, b) => {
        const priceA = a.has_discount && a.discounted_price ? a.discounted_price : a.price
        const priceB = b.has_discount && b.discounted_price ? b.discounted_price : b.price
        return sort === "price_asc" ? priceA - priceB : priceB - priceA
      })
    }

    // Sort by popularity AFTER all data enrichment is complete
    if (sort === "popularity" && products) {
      // Debug logging
      console.log("[Group9] Sorting by popularity. Wishlist counts:", 
        products.map(p => ({ name: p.name, pid: p.pid, wishlist_count: p.wishlist_count }))
      )
      
      products = products.sort((a, b) => {
        const countA = a.wishlist_count || 0
        const countB = b.wishlist_count || 0
        const result = countB - countA // Descending order (most popular first)
        
        // Debug logging for first few comparisons
        if (Math.abs(countA - countB) > 0) {
          console.log(`[Group9] Comparing ${a.name} (${countA}) vs ${b.name} (${countB}) = ${result}`)
        }
        
        return result
      })
      
      console.log("[Group9] After popularity sort:", 
        products.map(p => ({ name: p.name, wishlist_count: p.wishlist_count }))
      )
    }

    // Sort by rating AFTER all data enrichment is complete
    if (sort === "rating" && products) {
      products = products.sort((a, b) => {
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        // If ratings are equal, sort by number of reviews (more reviews = more reliable)
        if (ratingA === ratingB) {
          const reviewCountA = a.review_count || 0
          const reviewCountB = b.review_count || 0
          return reviewCountB - reviewCountA
        }
        return ratingB - ratingA // Descending order (highest rated first)
      })
    }

    // Final debug: log first 3 products before returning
    if (sort === "popularity" && products && products.length > 0) {
      console.log("[Group9] Final products order (first 3):", 
        products.slice(0, 3).map(p => ({ name: p.name, pid: p.pid, wishlist_count: p.wishlist_count }))
      )
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
