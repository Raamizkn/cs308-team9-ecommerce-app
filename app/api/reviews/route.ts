import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

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
      console.log("[Group9] Fetching profiles for customer IDs:", customerIds)

      // Use service role key to bypass RLS for fetching names
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const profileClient = serviceRoleKey
        ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
        : supabase // Fallback to regular client (will fail if RLS blocks)

      const { data: profilesData, error: profilesError } = await profileClient
        .from("profiles")
        .select("uid, name")
        .in("uid", customerIds)

      if (profilesError) {
        console.error("[Group9] Error fetching profiles:", profilesError)
        console.error("[Group9] Profile error details:", JSON.stringify(profilesError, null, 2))
      } else {
        console.log("[Group9] Fetched profiles:", profilesData?.length || 0, "profiles")
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = profile.name || "Anonymous"
          })
        }
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

    // Validate required fields - product_id is required, rating and comment are optional (but at least one must be provided)
    if (!product_id) {
      return NextResponse.json(
        { error: "Missing required field: product_id is required" },
        { status: 400 }
      )
    }

    // At least one of rating or comment must be provided
    const commentText = comment?.trim() || null
    if (!rating && !commentText) {
      return NextResponse.json(
        { error: "At least one of rating or comment must be provided" },
        { status: 400 }
      )
    }

    // Validate rating range (1-5) if provided
    if (rating !== null && rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json(
          { error: "Rating must be an integer between 1 and 5" },
          { status: 400 }
        )
      }
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

    // Check separately for existing rating row and comment row
    // Rating row: rating IS NOT NULL, comment IS NULL
    // Comment row: comment IS NOT NULL, rating IS NULL

    const { data: existingReviews, error: existingError } = await supabase
      .from("reviews")
      .select("review_id, rating, comment")
      .eq("product_id", parseInt(product_id))
      .eq("customer_id", user.id)

    if (existingError) {
      console.error("[Group9] Error checking existing reviews:", existingError)
      return NextResponse.json(
        { error: "Failed to check existing reviews" },
        { status: 500 }
      )
    }

    // Find existing rating row (rating IS NOT NULL, comment IS NULL)
    const existingRatingRow = existingReviews?.find(
      (r: any) => r.rating !== null && r.comment === null
    )

    // Find existing comment row (comment IS NOT NULL, rating IS NULL)
    const existingCommentRow = existingReviews?.find(
      (r: any) => r.comment !== null && r.rating === null
    )

    // Handle rating submission
    if (rating !== null && rating !== undefined) {
      if (existingRatingRow) {
        // Update existing rating row
        const { data: updatedReview, error: updateError } = await supabase
          .from("reviews")
          .update({ rating })
          .eq("review_id", existingRatingRow.review_id)
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

        if (updateError) {
          console.error("[Group9] Error updating rating:", updateError)
          return NextResponse.json(
            { error: updateError.message || "Failed to update rating" },
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

        const transformedReview = {
          id: updatedReview.review_id,
          review_id: updatedReview.review_id,
          productId: updatedReview.product_id,
          productName: updatedReview.products_belong_to?.name || "Unknown Product",
          customerId: updatedReview.customer_id,
          customerName: customerName,
          rating: updatedReview.rating,
          comment: updatedReview.comment,
          status: updatedReview.status,
          createdAt: updatedReview.created_at,
          profiles: { name: customerName },
          is_approved: updatedReview.status === "approved",
        }

        return NextResponse.json(
          {
            message: "Rating updated successfully.",
            review: transformedReview,
          },
          { status: 200 }
        )
      } else {
        // Create new rating row (rating NOT NULL, comment NULL, status = 'approved')
        const { data: newRatingReview, error: insertError } = await supabase
          .from("reviews")
          .insert({
            product_id: parseInt(product_id),
            customer_id: user.id,
            rating: rating,
            comment: null,
            status: "approved", // Ratings are auto-approved (status doesn't really matter for ratings)
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
          console.error("[Group9] Error creating rating:", insertError)
          return NextResponse.json(
            { error: insertError.message || "Failed to create rating" },
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

        const transformedReview = {
          id: newRatingReview.review_id,
          review_id: newRatingReview.review_id,
          productId: newRatingReview.product_id,
          productName: newRatingReview.products_belong_to?.name || "Unknown Product",
          customerId: newRatingReview.customer_id,
          customerName: customerName,
          rating: newRatingReview.rating,
          comment: newRatingReview.comment,
          status: newRatingReview.status,
          createdAt: newRatingReview.created_at,
          profiles: { name: customerName },
          is_approved: newRatingReview.status === "approved",
        }

        return NextResponse.json(
          {
            message: "Rating submitted successfully.",
            review: transformedReview,
          },
          { status: 201 }
        )
      }
    }

    // Handle comment submission
    if (commentText) {
      if (existingCommentRow) {
        // Update existing comment row
        const { data: updatedReview, error: updateError } = await supabase
          .from("reviews")
          .update({
            comment: commentText,
            status: "pending" // Comments always need approval
          })
          .eq("review_id", existingCommentRow.review_id)
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

        if (updateError) {
          console.error("[Group9] Error updating comment:", updateError)
          return NextResponse.json(
            { error: updateError.message || "Failed to update comment" },
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

        const transformedReview = {
          id: updatedReview.review_id,
          review_id: updatedReview.review_id,
          productId: updatedReview.product_id,
          productName: updatedReview.products_belong_to?.name || "Unknown Product",
          customerId: updatedReview.customer_id,
          customerName: customerName,
          rating: updatedReview.rating,
          comment: updatedReview.comment,
          status: updatedReview.status,
          createdAt: updatedReview.created_at,
          profiles: { name: customerName },
          is_approved: updatedReview.status === "approved",
        }

        return NextResponse.json(
          {
            message: "Comment updated. Your comment will be visible after product manager approval.",
            review: transformedReview,
          },
          { status: 200 }
        )
      } else {
        // Create new comment row (comment NOT NULL, rating NULL, status = 'pending')
        const { data: newCommentReview, error: insertError } = await supabase
          .from("reviews")
          .insert({
            product_id: parseInt(product_id),
            customer_id: user.id,
            rating: null,
            comment: commentText,
            status: "pending", // Comments need approval
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
          console.error("[Group9] Error creating comment:", insertError)
          return NextResponse.json(
            { error: insertError.message || "Failed to create comment" },
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

        const transformedReview = {
          id: newCommentReview.review_id,
          review_id: newCommentReview.review_id,
          productId: newCommentReview.product_id,
          productName: newCommentReview.products_belong_to?.name || "Unknown Product",
          customerId: newCommentReview.customer_id,
          customerName: customerName,
          rating: newCommentReview.rating,
          comment: newCommentReview.comment,
          status: newCommentReview.status,
          createdAt: newCommentReview.created_at,
          profiles: { name: customerName },
          is_approved: false,
        }

        return NextResponse.json(
          {
            message: "Comment submitted successfully. Your comment will be visible after product manager approval.",
            review: transformedReview,
          },
          { status: 201 }
        )
      }
    }

    // Should not reach here due to validation at the top, but just in case
    return NextResponse.json(
      { error: "At least one of rating or comment must be provided" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

