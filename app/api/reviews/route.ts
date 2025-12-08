import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// GET - Fetch reviews (for product managers: all reviews, for customers: approved reviews only, for guests: approved reviews only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get("product_id")
    const status = searchParams.get("status") // pending, approved, rejected, or null for all

    // Check if user is authenticated (optional - guests can view approved reviews)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let isProductManager = false
    if (user) {
      // Check if user is a product manager
      const { data: pmData } = await supabase
        .from("product_managers")
        .select("uid")
        .eq("uid", user.id)
        .maybeSingle()

      isProductManager = !!pmData
    }

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

    // For non-product managers:
    // - Show all approved reviews (ratings + comments visible)
    // - Show user's own pending reviews (rating visible, comment pending)
    // - Don't show other users' pending reviews
    // For product managers: show all reviews
    if (!isProductManager) {
      // We'll use RLS policies which allow:
      // 1. Viewing approved reviews (anyone)
      // 2. Viewing own reviews (customer)
      // So we don't need to filter here - RLS will handle it
      // But we need to fetch all that the user can see
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
      const isApproved = review.status === "approved"
      
      // For non-product managers: ratings are always visible, but comments only if approved
      // For product managers: show everything
      return {
        id: review.review_id,
        review_id: review.review_id,
        productId: review.product_id,
        productName: review.products_belong_to?.name || "Unknown Product",
        customerId: review.customer_id,
        customerName: customerName,
        rating: review.rating, // Rating is always visible
        comment: isProductManager || isApproved ? review.comment : null, // Comment only if approved (or if PM)
        status: review.status,
        createdAt: review.created_at,
        approvedAt: review.approved_at,
        approvedBy: review.approved_by,
        // Include profiles object for backward compatibility with product page
        profiles: { name: customerName },
        // Include is_approved for backward compatibility
        is_approved: isApproved,
        // Flag to indicate if comment is visible
        commentVisible: isProductManager || isApproved,
      }
    })

    return NextResponse.json({ reviews: transformedReviews || [] })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { product_id, rating, comment } = body

    // Validate required fields
    if (!product_id || !rating || !comment) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, rating, and comment are required" },
        { status: 400 }
      )
    }

    // Validate rating range (1-5)
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      )
    }

    // Validate comment is not empty
    if (comment.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      )
    }

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a customer
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (customerError || !customerData) {
      return NextResponse.json(
        { error: "Only customers can submit reviews" },
        { status: 403 }
      )
    }

    // Check if user has delivered orders containing this product
    const { data: deliveredOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_items!inner (
          product_id
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "delivered")

    if (ordersError) {
      console.error("[Group9] Error checking delivered orders:", ordersError)
      return NextResponse.json(
        { error: "Failed to verify order history" },
        { status: 500 }
      )
    }

    // Check if any delivered order contains this product
    const hasDeliveredProduct = deliveredOrders?.some((order: any) =>
      order.order_items?.some((item: any) => item.product_id === parseInt(product_id))
    )

    if (!hasDeliveredProduct) {
      return NextResponse.json(
        { error: "You can only review products you have purchased and received. The product must be in a delivered order." },
        { status: 403 }
      )
    }

    // Check if user already reviewed this product
    const { data: existingReview, error: existingError } = await supabase
      .from("reviews")
      .select("review_id")
      .eq("product_id", parseInt(product_id))
      .eq("customer_id", user.id)
      .maybeSingle()

    if (existingError) {
      console.error("[Group9] Error checking existing review:", existingError)
      return NextResponse.json(
        { error: "Failed to check existing reviews" },
        { status: 500 }
      )
    }

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 }
      )
    }

    // Create the review
    const { data: newReview, error: insertError } = await supabase
      .from("reviews")
      .insert({
        product_id: parseInt(product_id),
        customer_id: user.id,
        rating: rating,
        comment: comment.trim(),
        status: "pending", // Comments need approval, but ratings are submitted directly
      })
      .select(`
        review_id,
        product_id,
        customer_id,
        rating,
        comment,
        status,
        created_at,
        products_belong_to:product_id (
          pid,
          name
        )
      `)
      .single()

    if (insertError) {
      console.error("[Group9] Error creating review:", insertError)
      return NextResponse.json(
        { error: insertError.message || "Failed to create review" },
        { status: 500 }
      )
    }

    // Fetch customer name
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name")
      .eq("uid", user.id)
      .maybeSingle()

    const customerName = profileData?.name || "Anonymous"

    // Transform response
    const transformedReview = {
      id: newReview.review_id,
      review_id: newReview.review_id,
      productId: newReview.product_id,
      productName: newReview.products_belong_to?.name || "Unknown Product",
      customerId: newReview.customer_id,
      customerName: customerName,
      rating: newReview.rating,
      comment: newReview.comment,
      status: newReview.status,
      createdAt: newReview.created_at,
      profiles: { name: customerName },
      is_approved: false,
    }

    return NextResponse.json(
      {
        message: "Review submitted successfully. It will be visible after product manager approval.",
        review: transformedReview,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

