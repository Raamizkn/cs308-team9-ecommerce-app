import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_BUCKETS = new Set(["day", "week", "month"])

function parseBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null

  const match = headerValue.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

function validateDate(value: string | null, label: string): string | null {
  if (!value || value.trim().length === 0) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} parameter`)
  }
  return parsed.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = parseBearerToken(request.headers.get("authorization"))

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create Supabase client for auth verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify the access token and get user
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const user = authData.user

    // Create an authenticated client for RLS-protected queries
    // Use service role key if available, otherwise use anon key with user context
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const queryClient = serviceRoleKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          }
        )

    // Check if user is a sales manager
    const { data: salesManagerData, error: salesManagerError } = await queryClient
      .from("sales_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (salesManagerError) {
      console.error("[Analytics] Sales manager check error:", salesManagerError)
      console.error("[Analytics] User ID:", user.id)
      // If using service role, this shouldn't fail. If using anon key, RLS might block it.
      // For now, let's be more lenient and check if the error is RLS-related
      if (salesManagerError.message?.includes("permission") || salesManagerError.message?.includes("policy")) {
        // RLS is blocking - this means either user is not a sales manager OR RLS is misconfigured
        // Since we can't verify, we'll deny access
        return NextResponse.json({ 
          error: "Forbidden: Sales manager access required", 
          details: "Unable to verify sales manager status. Please ensure you are registered as a sales manager."
        }, { status: 403 })
      }
      return NextResponse.json({ 
        error: "Forbidden: Sales manager access required", 
        details: salesManagerError.message 
      }, { status: 403 })
    }

    if (!salesManagerData) {
      return NextResponse.json({ 
        error: "Forbidden: Sales manager access required. User is not registered as a sales manager.",
        userId: user.id
      }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const start = validateDate(searchParams.get("start"), "start")
    const end = validateDate(searchParams.get("end"), "end")
    const bucket = (searchParams.get("groupBy") || "day").toLowerCase()

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { error: `Invalid groupBy value. Expected one of: ${Array.from(ALLOWED_BUCKETS).join(", ")}` },
        { status: 400 },
      )
    }

    if (start && end && new Date(start) > new Date(end)) {
      return NextResponse.json({ error: "`start` must be before `end`" }, { status: 400 })
    }

    const { data, error } = await supabase.rpc("get_revenue_profit", {
      p_start: start,
      p_end: end,
      p_bucket: bucket,
    })

    if (error) {
      console.error("[Analytics] get_revenue_profit error:", error)
      return NextResponse.json({ error: "Failed to compute analytics", details: error.message }, { status: 500 })
    }

    type RpcRow = {
      bucket: string
      revenue: number | string | null
      cost: number | string | null
      profit: number | string | null
    }

    type Totals = { totalRevenue: number; totalCost: number; totalProfit: number }

    type RevenueDataPoint = {
      bucket: string
      revenue: number
      cost: number
      profit: number
    }

    const rawPoints: RpcRow[] = (data || []) as RpcRow[]

    // Convert all values to numbers and ensure type safety
    const points: RevenueDataPoint[] = rawPoints.map((row) => ({
      bucket: String(row.bucket),
      revenue: Number(row.revenue ?? 0),
      cost: Number(row.cost ?? 0),
      profit: Number(row.profit ?? 0),
    }))

    // Calculate totals - explicitly typed as numbers
    const totals: Totals = points.reduce<Totals>(
      (acc, row) => {
        acc.totalRevenue += row.revenue
        acc.totalCost += row.cost
        acc.totalProfit += row.profit
        return acc
      },
      { totalRevenue: 0, totalCost: 0, totalProfit: 0 },
    )

    // Ensure totals are properly typed numbers
    // Round to 2 decimal places for currency precision
    const typedTotals: Totals = {
      totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
      totalCost: Math.round(totals.totalCost * 100) / 100,
      totalProfit: Math.round(totals.totalProfit * 100) / 100,
    }

    return NextResponse.json({
      bucket,
      start,
      end,
      totals: typedTotals,
      points,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("[Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

