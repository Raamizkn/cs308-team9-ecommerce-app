"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Package, User, LogOut, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
    fetchOrders()
  }, [])

  const fetchUserData = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
        setUser(data || { email: user.email, name: user.user_metadata?.name })
      }
    } catch (error) {
      console.error("[Group9] Error fetching user:", error)
    }
  }

  const fetchOrders = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*, products(*))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        setOrders(data || [])
      }
    } catch (error) {
      console.error("[Group9] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[Group9] Logout error:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-[#6bcf7f]"
      case "shipped":
        return "bg-[#4ecdc4]"
      case "processing":
        return "bg-[#ffb347]"
      case "cancelled":
        return "bg-[#dc3545]"
      default:
        return "bg-[#6c757d]"
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
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-[#4ecdc4] border-4 border-black flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-[#1a1a3e]" />
                </div>
                <h2 className="font-bold text-xl text-[#1a1a3e] text-center">{user?.name || "User"}</h2>
                <p className="text-sm text-[#6c757d] text-center">{user?.email}</p>
              </div>

              <div className="space-y-2">
                <Link href="/profile">
                  <Button className="w-full bg-white text-black border-4 border-black font-bold justify-start hover:bg-[#e9ecef]">
                    <User className="h-4 w-4 mr-2" />
                    PROFILE
                  </Button>
                </Link>
                <Link href="/orders">
                  <Button className="w-full bg-[#5b3a8f] text-white border-4 border-black font-bold justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    MY ORDERS
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  className="w-full bg-white text-[#dc3545] border-4 border-black font-bold justify-start hover:bg-[#dc3545] hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  LOGOUT
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">MY ORDERS</h1>
              <p className="text-[#6c757d] font-semibold">{orders.length} orders placed</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
                <Package className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
                <p className="text-2xl font-bold text-[#6c757d] mb-4">No orders yet</p>
                <Link href="/">
                  <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                    START SHOPPING
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border-4 border-black p-6 pixel-shadow-sm">
                    <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                      <div>
                        <p className="text-sm text-[#6c757d] font-semibold">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-[#6c757d]">
                          {new Date(order.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`${getStatusColor(order.status)} text-white px-4 py-2 border-2 border-black font-bold text-sm`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                        <span className="font-[family-name:var(--font-pixel)] text-xl text-[#5b3a8f]">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t-4 border-[#e9ecef] pt-4 mb-4">
                      <p className="text-sm font-bold text-[#1a1a3e] mb-2">Items:</p>
                      <ul className="space-y-1">
                        {order.order_items?.map((item: any) => (
                          <li key={item.id} className="text-sm text-[#6c757d]">
                            {item.products?.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href={`/orders/${order.id}`}>
                      <Button className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold">
                        <Eye className="h-4 w-4 mr-2" />
                        VIEW DETAILS
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
