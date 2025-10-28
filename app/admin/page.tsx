"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { BarChart3, Package, Users, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()

      if (!userData || !["sales_manager", "product_manager", "support_agent"].includes(userData.role)) {
        router.push("/")
        return
      }

      setUser(userData)
    } catch (error) {
      console.error("[Group9] Error checking admin access:", error)
      router.push("/")
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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">ADMIN DASHBOARD</h1>
          <p className="text-[#6c757d] font-semibold">
            Welcome back, {user?.name} ({user?.role?.replace("_", " ").toUpperCase()})
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(user?.role === "sales_manager" || user?.role === "product_manager") && (
            <Link href="/admin/sales">
              <div className="bg-[#4ecdc4] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <BarChart3 className="h-12 w-12 text-[#1a1a3e] mb-4" />
                <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">SALES ANALYTICS</h2>
                <p className="text-[#0d0d1a]">View sales reports and revenue data</p>
              </div>
            </Link>
          )}

          {user?.role === "product_manager" && (
            <Link href="/admin/products">
              <div className="bg-[#ffb347] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <Package className="h-12 w-12 text-[#1a1a3e] mb-4" />
                <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">PRODUCT MANAGEMENT</h2>
                <p className="text-[#0d0d1a]">Manage products and inventory</p>
              </div>
            </Link>
          )}

          {user?.role === "support_agent" && (
            <Link href="/admin/support">
              <div className="bg-[#ff6b9d] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <MessageSquare className="h-12 w-12 text-white mb-4" />
                <h2 className="font-bold text-2xl text-white mb-2">CUSTOMER SUPPORT</h2>
                <p className="text-white">Handle refunds and support tickets</p>
              </div>
            </Link>
          )}

          {(user?.role === "sales_manager" || user?.role === "support_agent") && (
            <Link href="/admin/orders">
              <div className="bg-[#5b3a8f] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <Users className="h-12 w-12 text-white mb-4" />
                <h2 className="font-bold text-2xl text-white mb-2">ORDER MANAGEMENT</h2>
                <p className="text-white">View and manage all orders</p>
              </div>
            </Link>
          )}

          {user?.role === "support_agent" && (
            <Link href="/admin/chat">
              <div className="bg-[#6bcf7f] border-4 border-black p-8 pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <MessageSquare className="h-12 w-12 text-[#1a1a3e] mb-4" />
                <h2 className="font-bold text-2xl text-[#1a1a3e] mb-2">LIVE CHAT</h2>
                <p className="text-[#0d0d1a]">Respond to customer messages</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
