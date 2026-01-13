import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    // Verify the requester is a product manager
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager, support agent, OR sales manager
    const [productManagerResult, supportAgentResult, salesManagerResult] = await Promise.all([
      supabase.from("product_managers").select("uid").eq("uid", user.id).maybeSingle(),
      supabase.from("support_agents").select("uid").eq("uid", user.id).maybeSingle(),
      supabase.from("sales_managers").select("uid").eq("uid", user.id).maybeSingle(),
    ])

    const isProductManager = productManagerResult.data !== null
    const isSupportAgent = supportAgentResult.data !== null
    const isSalesManager = salesManagerResult.data !== null

    // Allow if user is any of these roles
    if (!isProductManager && !isSupportAgent && !isSalesManager) {
      return NextResponse.json({ error: "Forbidden: Product manager, Support agent, or Sales manager access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    // Use service role key to fetch user email from auth.users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("[Group9] SUPABASE_SERVICE_ROLE_KEY is not set. Cannot fetch user email.")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

    const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId)

    if (authUserError || !authUser?.user?.email) {
      console.error(`[Group9] Error fetching user email for ${userId}:`, authUserError?.message || "Email not found")
      return NextResponse.json({ error: "User email not found" }, { status: 404 })
    }

    return NextResponse.json({ email: authUser.user.email })
  } catch (error) {
    console.error("[Group9] Unexpected error in user email route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
