import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// PATCH - Update review status (approve or reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient()
    const { id } = await params
    const body = await request.json()
    const { action } = body // "approve" or "reject"

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
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

    // Check if user is a product manager
    const { data: pmData, error: pmError } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (pmError || !pmData) {
      return NextResponse.json({ error: "Forbidden: Product manager access required" }, { status: 403 })
    }

    // Check if review exists
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("review_id, status")
      .eq("review_id", id)
      .maybeSingle()

    if (fetchError) {
      console.error("[Group9] Error fetching review:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Update review status
    const newStatus = action === "approve" ? "approved" : "rejected"
    const updateData: any = {
      status: newStatus,
    }

    if (action === "approve") {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = user.id
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("review_id", id)
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
      .single()

    if (updateError) {
      console.error("[Group9] Error updating review:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch customer name separately
    let customerName = "Anonymous"
    if (updatedReview.customer_id) {
      console.log("[Group9] Fetching profile for customer ID:", updatedReview.customer_id)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name")
        .eq("uid", updatedReview.customer_id)
        .maybeSingle()
      
      if (profileError) {
        console.error("[Group9] Error fetching profile:", profileError)
        console.error("[Group9] Profile error details:", JSON.stringify(profileError, null, 2))
      } else if (profileData) {
        customerName = profileData.name || "Anonymous"
        console.log("[Group9] Found customer name:", customerName)
      } else {
        console.log("[Group9] No profile found for customer ID:", updatedReview.customer_id)
      }
    }

    // Transform response
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
      approvedAt: updatedReview.approved_at,
      approvedBy: updatedReview.approved_by,
      // Include profiles object for backward compatibility
      profiles: { name: customerName },
      // Include is_approved for backward compatibility
      is_approved: updatedReview.status === "approved",
    }

    return NextResponse.json({
      message: `Review ${action === "approve" ? "approved" : "rejected"} successfully`,
      review: transformedReview,
    })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

