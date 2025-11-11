import { NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

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
  const supabase = getSupabaseServerClient()

  try {
    const accessToken = parseBearerToken(request.headers.get("authorization"))

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: "",
    })

    if (setSessionError || !setSessionData?.session) {
      return NextResponse.json({ error: "Failed to establish session" }, { status: 401 })
    }

    const user = authData.user

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    }

    if (profile.role !== "sales_manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
      return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 })
    }

    type RpcRow = {
      bucket: string
      revenue: number | string | null
      cost: number | string | null
      profit: number | string | null
    }

    type Totals = { totalRevenue: number; totalCost: number; totalProfit: number }

    const points: RpcRow[] = (data || []) as RpcRow[]

    const totals = points.reduce<Totals>(
      (acc, row) => {
        acc.totalRevenue += Number(row.revenue ?? 0)
        acc.totalCost += Number(row.cost ?? 0)
        acc.totalProfit += Number(row.profit ?? 0)
        return acc
      },
      { totalRevenue: 0, totalCost: 0, totalProfit: 0 },
    )

    return NextResponse.json({
      bucket,
      start,
      end,
      totals,
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

