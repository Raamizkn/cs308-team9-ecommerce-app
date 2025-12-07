"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, DollarSign, ShoppingBag, TrendingUp, Package } from "lucide-react"

export default function SalesAnalyticsPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    averageOrderValue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch orders
      const { data: orders } = await supabase.from("orders").select("*")

      // Fetch products
      const { data: products } = await supabase.from("products").select("*")

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0
      const totalOrders = orders?.length || 0
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts: products?.length || 0,
        averageOrderValue,
      })

      // Get recent orders
      const { data: recent } = await supabase
        .from("orders")
        .select("*, order_items(*, products(*))")
        .order("created_at", { ascending: false })
        .limit(10)

      setRecentOrders(recent || [])
    } catch (error) {
      console.error("[Group9] Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admin">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">SALES ANALYTICS</h1>
          <p className="text-[#6c757d] font-semibold">Overview of sales performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#6bcf7f] border-4 border-black p-6 pixel-shadow-sm">
            <DollarSign className="h-8 w-8 text-[#1a1a3e] mb-3" />
            <p className="text-sm font-bold text-[#1a1a3e] mb-1">TOTAL REVENUE</p>
            <p className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
              ${stats.totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#4ecdc4] border-4 border-black p-6 pixel-shadow-sm">
            <ShoppingBag className="h-8 w-8 text-[#1a1a3e] mb-3" />
            <p className="text-sm font-bold text-[#1a1a3e] mb-1">TOTAL ORDERS</p>
            <p className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">{stats.totalOrders}</p>
          </div>

          <div className="bg-[#ffb347] border-4 border-black p-6 pixel-shadow-sm">
            <TrendingUp className="h-8 w-8 text-[#1a1a3e] mb-3" />
            <p className="text-sm font-bold text-[#1a1a3e] mb-1">AVG ORDER VALUE</p>
            <p className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
              ${stats.averageOrderValue.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#ff6b9d] border-4 border-black p-6 pixel-shadow-sm">
            <Package className="h-8 w-8 text-white mb-3" />
            <p className="text-sm font-bold text-white mb-1">TOTAL PRODUCTS</p>
            <p className="font-[family-name:var(--font-pixel)] text-2xl text-white">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
          <h2 className="font-bold text-2xl text-[#1a1a3e] mb-6">RECENT ORDERS</h2>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="border-b-4 border-[#e9ecef] pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-[#1a1a3e]">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-[#6c757d]">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-[#5b3a8f]">${order.total.toFixed(2)}</p>
                    <span
                      className={`text-xs px-2 py-1 border-2 border-black font-bold ${order.status === "delivered"
                          ? "bg-[#6bcf7f]"
                          : order.status === "in-transit"
                            ? "bg-[#4ecdc4]"
                            : "bg-[#ffb347]"
                        }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#6c757d]">
                  {order.order_items?.length || 0} item(s) - {order.shipping_address}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
