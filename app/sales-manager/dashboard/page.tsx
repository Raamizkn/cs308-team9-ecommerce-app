"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  FileText,
  Percent,
  BarChart3,
  Package,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SalesManagerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        router.push("/sales-manager/login")
        return
      }

      // Check if user is a sales manager
      // Using .maybeSingle() to avoid errors when user doesn't have that role
      const { data: salesManagerData, error: roleError } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !salesManagerData) {
        router.push("/sales-manager/login")
        return
      }

      // Get user profile
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
      router.push("/sales-manager/login")
    } finally {
      setLoading(false)
    }
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
                SALES MANAGER DASHBOARD
              </h1>
              <p className="text-[#6c757d] font-semibold">
                Welcome back, {user?.name || "Sales Manager"}
              </p>
            </div>
            <Link href="/">
              <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/sales-manager/pricing">
            <div className="bg-[#4ecdc4] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <DollarSign className="h-12 w-12 text-[#1a1a3e] mb-4" />
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">PRICING MANAGEMENT</h2>
              <p className="text-[#0d0d1a]">Set product prices and manage pricing strategies</p>
            </div>
          </Link>

          <Link href="/sales-manager/discounts">
            <div className="bg-[#ffb347] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <Percent className="h-12 w-12 text-[#1a1a3e] mb-4" />
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">DISCOUNT CAMPAIGNS</h2>
              <p className="text-[#0d0d1a]">Create and manage discount campaigns</p>
            </div>
          </Link>

          <Link href="/sales-manager/invoices">
            <div className="bg-[#5b3a8f] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <FileText className="h-12 w-12 text-white mb-4" />
              <h2 className="font-bold text-2xl text-white mb-2">INVOICES</h2>
              <p className="text-white">View, print, and export invoices by date range</p>
            </div>
          </Link>

          <Link href="/sales-manager/revenue">
            <div className="bg-[#6bcf7f] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <BarChart3 className="h-12 w-12 text-[#1a1a3e] mb-4" />
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">REVENUE & PROFIT</h2>
              <p className="text-[#0d0d1a]">Calculate revenue and profit/loss with charts</p>
            </div>
          </Link>

          <Link href="/sales-manager/orders">
            <div className="bg-[#ff6b9d] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <ShoppingBag className="h-12 w-12 text-white mb-4" />
              <h2 className="font-bold text-2xl text-white mb-2">ORDER OVERVIEW</h2>
              <p className="text-white">View all orders and order details</p>
            </div>
          </Link>

          <Link href="/sales-manager/refunds">
            <div className="bg-[#9b59b6] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <TrendingUp className="h-12 w-12 text-white mb-4" />
              <h2 className="font-bold text-2xl text-white mb-2">REFUND REQUESTS</h2>
              <p className="text-white">Evaluate and process refund requests</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
