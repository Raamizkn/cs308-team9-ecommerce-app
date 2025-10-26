import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Discount code is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("discount_campaigns")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Invalid discount code" }, { status: 404 })
    }

    // Check if discount is still valid
    const now = new Date()
    const validUntil = new Date(data.valid_until)

    if (now > validUntil) {
      return NextResponse.json({ error: "Discount code has expired" }, { status: 400 })
    }

    return NextResponse.json({
      discount_percentage: data.discount_percentage,
      code: data.code,
    })
  } catch (error) {
    console.error("[Group9] Error validating discount:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
