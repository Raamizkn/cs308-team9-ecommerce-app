import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// GET - Fetch reviews (for product managers: all reviews, for customers: approved reviews only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("product_id")
    const status = searchParams.get("status") // pending, approved, rejected, or null for all

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager
    const { data: pmData } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    const isProductManager = !!pmData

    // Build query - fetch reviews with product info
    // We'll fetch customer names separately to avoid join issues
    let query = supabase
      .from("reviews")
      .select(`
        review_id,
        product_id,
        customer_id,
        rating,
        comment,
        status,
        created_at,
        approved_at,
        approved_by,
        products_belong_to:product_id (
          pid,
          name
        )
      `)
      .order("created_at", { ascending: false })

    // If not product manager, only show approved reviews
    if (!isProductManager) {
      query = query.eq("status", "approved")
    }

    // Filter by product_id if provided
    if (productId) {
      query = query.eq("product_id", parseInt(productId))
    }

    // Filter by status if provided (only for product managers)
    if (status && isProductManager) {
      query = query.eq("status", status)
    }

    const { data: reviews, error } = await query

    if (error) {
      console.error("[Group9] Error fetching reviews:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch customer names separately
    const customerIds = [...new Set((reviews || []).map((r: any) => r.customer_id).filter(Boolean))]
    const profilesMap: Record<string, string> = {}
    
    if (customerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("uid, name")
        .in("uid", customerIds)
      
      if (profilesError) {
        console.error("[Group9] Error fetching profiles:", profilesError)
      } else if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap[profile.uid] = profile.name || "Anonymous"
        })
      }
    }

    // Transform data for frontend
    const transformedReviews = reviews?.map((review: any) => {
      const customerName = profilesMap[review.customer_id] || "Anonymous"
      return {
        id: review.review_id,
        review_id: review.review_id,
        productId: review.product_id,
        productName: review.products_belong_to?.name || "Unknown Product",
        customerId: review.customer_id,
        customerName: customerName,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.created_at,
        approvedAt: review.approved_at,
        approvedBy: review.approved_by,
        // Include profiles object for backward compatibility with product page
        profiles: { name: customerName },
        // Include is_approved for backward compatibility
        is_approved: review.status === "approved",
      }
    })

    return NextResponse.json({ reviews: transformedReviews || [] })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

