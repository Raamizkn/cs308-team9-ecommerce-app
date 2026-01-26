import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { sendDiscountAlertEmail } from "@/lib/discount-alerts/sendDiscountAlertEmail"

/**
 * API endpoint to send discount alert emails
 * Called from database trigger via pg_net extension
 * 
 * Expected payload:
 * {
 *   user_id: string (UUID),
 *   product_id: number,
 *   discount_id: number,
 *   discount_rate: number
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, product_id, discount_id, discount_rate } = body

    if (!user_id || !product_id || discount_id === undefined || !discount_rate) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, product_id, discount_id, discount_rate" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products_belong_to")
      .select("pid, name, price")
      .eq("pid", product_id)
      .single()

    if (productError || !product) {
      console.error("[Group9] Error fetching product:", productError)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch user profile (name from profiles, email from auth.users)
    // Use service role key if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const { createClient } = await import("@supabase/supabase-js")
    const profileClient = serviceRoleKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // Fetch profile name
    const { data: profile, error: profileError } = await profileClient
      .from("profiles")
      .select("uid, name")
      .eq("uid", user_id)
      .maybeSingle()

    if (profileError) {
      console.error("[Group9] Error fetching profile:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (!profile) {
      console.log("[Group9] No profile found for user:", user_id)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Fetch email from auth.users using Admin API
    let userEmail: string | null = null
    
    if (serviceRoleKey) {
      try {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )
        
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(user_id)
        
        if (authError) {
          console.error("[Group9] Error fetching email from auth.users:", authError)
        } else if (authUser?.user?.email) {
          userEmail = authUser.user.email
        }
      } catch (error) {
        console.error("[Group9] Error fetching email for user:", error)
      }
    }

    // Check if user has email
    if (!userEmail) {
      console.log("[Group9] User has no email in auth.users:", user_id)
      return NextResponse.json({ error: "User email not found in auth.users" }, { status: 404 })
    }

    // Send discount alert email
    const emailSent = await sendDiscountAlertEmail({
      userEmail: userEmail,
      userName: profile.name || "Customer",
      productId: product_id,
      productName: product.name,
      productPrice: parseFloat(product.price),
      discountRate: parseFloat(discount_rate.toString()),
      discountId: discount_id,
    })

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: "Discount alert email sent successfully",
      })
    } else {
      return NextResponse.json(
        { error: "Failed to send discount alert email" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[Group9] Error in discount alert email endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

