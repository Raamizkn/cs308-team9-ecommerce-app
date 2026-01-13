"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"

interface RevenueData {
  bucket: string
  revenue: number
  cost: number
  profit: number
}

interface RevenueResponse {
  bucket: string
  start: string | null
  end: string | null
  totals: {
    totalRevenue: number
    totalCost: number
    totalProfit: number
  }
  points: RevenueData[]
}

export default function RevenueProfitPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day")
  const [data, setData] = useState<RevenueResponse | null>(null)

  useEffect(() => {
    checkSalesManagerAccess()
  }, [])

  const checkSalesManagerAccess = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: salesManagerData, error: roleError } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !salesManagerData) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", authUser.id)
        .single()

      setUser({
        ...authUser,
        name: profileData?.name || authUser.email?.split("@")[0] || "Sales Manager",
      })
    } catch (error) {
      console.error("[Group9] Error checking sales manager access:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenueData = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setFetching(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication error",
          description: "Please log in again",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams({
        start: new Date(startDate).toISOString(),
        end: new Date(endDate + "T23:59:59").toISOString(),
        groupBy,
      })

      const response = await fetch(`/api/analytics/revenue?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch revenue data")
      }

      const result: RevenueResponse = await response.json()
      setData(result)
    } catch (error) {
      console.error("[Group9] Error fetching revenue data:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch revenue data",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (groupBy === "day") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } else if (groupBy === "week") {
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    } else {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
  }

  const chartData = data?.points.map((point) => ({
    date: formatDate(point.bucket),
    revenue: Number(point.revenue),
    cost: Number(point.cost),
    profit: Number(point.profit),
  })) || []

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "#6bcf7f",
    },
    cost: {
      label: "Cost",
      color: "#ff6b9d",
    },
    profit: {
      label: "Profit",
      color: "#4ecdc4",
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#4ecdc4] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/sales-manager/dashboard">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
              REVENUE & PROFIT ANALYSIS
            </h1>
            <p className="text-[#6c757d] font-semibold">Calculate revenue and profit/loss between date ranges</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white border-4 border-black p-6 pixel-shadow-sm mb-8">
          <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            SELECT DATE RANGE
          </h2>
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-4 border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-4 border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
                className="w-full px-4 py-2 border-4 border-black font-bold bg-white"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <Button
              onClick={fetchRevenueData}
              disabled={fetching}
              className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
            >
              {fetching ? "CALCULATING..." : "CALCULATE"}
            </Button>
          </div>
        </div>

        {/* Totals Display */}
        {data && (
          <>
            {data.points.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm mb-8">
                <BarChart3 className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
                <p className="text-2xl font-bold text-[#1a1a3e] mb-2">No Data Found</p>
                <p className="text-[#6c757d] mb-4">
                  No orders found for the selected date range. Try selecting a different date range.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mt-6">
                  <div className="bg-[#6bcf7f] border-4 border-black p-4">
                    <p className="text-sm font-bold text-[#1a1a3e] mb-1">TOTAL REVENUE</p>
                    <p className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                      {formatCurrency(data.totals.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-[#ff6b9d] border-4 border-black p-4">
                    <p className="text-sm font-bold text-white mb-1">TOTAL COST</p>
                    <p className="font-[family-name:var(--font-pixel)] text-2xl text-white">
                      {formatCurrency(data.totals.totalCost)}
                    </p>
                  </div>
                  <div className="bg-[#4ecdc4] border-4 border-black p-4">
                    <p className="text-sm font-bold text-[#1a1a3e] mb-1">TOTAL PROFIT</p>
                    <p className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                      {formatCurrency(data.totals.totalProfit)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#6bcf7f] border-4 border-black p-6 pixel-shadow-sm">
                    <DollarSign className="h-8 w-8 text-[#1a1a3e] mb-3" />
                    <p className="text-sm font-bold text-[#1a1a3e] mb-1">TOTAL REVENUE</p>
                    <p className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
                      {formatCurrency(data.totals.totalRevenue)}
                    </p>
                  </div>

                  <div className="bg-[#ff6b9d] border-4 border-black p-6 pixel-shadow-sm">
                    <TrendingDown className="h-8 w-8 text-white mb-3" />
                    <p className="text-sm font-bold text-white mb-1">TOTAL COST</p>
                    <p className="font-[family-name:var(--font-pixel)] text-3xl text-white">
                      {formatCurrency(data.totals.totalCost)}
                    </p>
                  </div>

                  <div
                    className={`border-4 border-black p-6 pixel-shadow-sm ${data.totals.totalProfit >= 0 ? "bg-[#4ecdc4]" : "bg-[#dc3545]"
                      }`}
                  >
                    <TrendingUp className={`h-8 w-8 mb-3 ${data.totals.totalProfit >= 0 ? "text-[#1a1a3e]" : "text-white"}`} />
                    <p className={`text-sm font-bold mb-1 ${data.totals.totalProfit >= 0 ? "text-[#1a1a3e]" : "text-white"}`}>
                      {data.totals.totalProfit >= 0 ? "TOTAL PROFIT" : "TOTAL LOSS"}
                    </p>
                    <p
                      className={`font-[family-name:var(--font-pixel)] text-3xl ${data.totals.totalProfit >= 0 ? "text-[#1a1a3e]" : "text-white"
                        }`}
                    >
                      {formatCurrency(Math.abs(data.totals.totalProfit))}
                    </p>
                    {data.totals.totalRevenue > 0 && (
                      <p className={`text-xs mt-2 font-bold ${data.totals.totalProfit >= 0 ? "text-[#1a1a3e]" : "text-white"}`}>
                        Margin: {((data.totals.totalProfit / data.totals.totalRevenue) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Charts */}
                {chartData.length > 0 && (
                  <div className="space-y-8">
                    {/* Revenue and Profit Line Chart */}
                    <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
                      <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4 flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        REVENUE & PROFIT OVER TIME
                      </h2>
                      <ChartContainer config={chartConfig} className="h-[400px]">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke={chartConfig.revenue.color}
                            strokeWidth={3}
                            name="Revenue"
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke={chartConfig.profit.color}
                            strokeWidth={3}
                            name="Profit"
                          />
                        </LineChart>
                      </ChartContainer>
                    </div>

                    {/* Revenue vs Cost Bar Chart */}
                    <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
                      <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4">REVENUE VS COST</h2>
                      <ChartContainer config={chartConfig} className="h-[400px]">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="revenue" fill={chartConfig.revenue.color} name="Revenue" />
                          <Bar dataKey="cost" fill={chartConfig.cost.color} name="Cost" />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!data && (
          <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
            <BarChart3 className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
            <p className="text-2xl font-bold text-[#6c757d] mb-4">Select a date range to view revenue and profit data</p>
            <p className="text-[#6c757d]">Choose your start and end dates, then click Calculate to see the analysis</p>
          </div>
        )}
      </main>
    </div>
  )
}

