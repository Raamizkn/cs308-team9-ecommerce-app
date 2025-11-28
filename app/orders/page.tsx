"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Package, User, LogOut, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

type RefundSummary = { approved: number; pending: number; rejected: number }

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refundSummaryByItem, setRefundSummaryByItem] = useState<Record<string, RefundSummary>>({})
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [submittingItem, setSubmittingItem] = useState<string | null>(null)

  useEffect(() => {
    checkSalesManagerRedirect()
    fetchUserData()
    fetchOrders()
  }, [])

  const checkSalesManagerRedirect = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: salesManagerData } = await supabase
          .from("sales_managers")
          .select("uid")
          .eq("uid", authUser.id)
          .maybeSingle()

        if (salesManagerData) {
          router.push("/sales-manager/dashboard")
          return
        }
      }
    } catch (error) {
      console.error("[Group9] Error checking sales manager:", error)
    }
  }

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

  const isWithinRefundWindow = (createdAt: string) => {
    const purchaseDate = new Date(createdAt)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return purchaseDate >= thirtyDaysAgo
  }

  const remainingRefundableQty = (itemId: string, purchasedQty: number) => {
    const summary = refundSummaryByItem[itemId]
    if (!summary) return purchasedQty
    const reservedQty = summary.approved + summary.pending
    const remaining = purchasedQty - reservedQty
    return remaining > 0 ? remaining : 0
  }

  const loadRefundSummaries = async (supabaseClient: any, ordersData: any[]) => {
    const itemIds = ordersData.flatMap((order: any) => order.order_items?.map((item: any) => item.id) ?? [])

    if (itemIds.length === 0) {
      setRefundSummaryByItem({})
      return
    }

    const { data: refunds, error } = await supabaseClient
      .from("refund_requests")
      .select("order_item_id, quantity, status")
      .in("order_item_id", itemIds)

    if (error) {
      console.error("[Group9] Error fetching refunds:", error)
      setRefundSummaryByItem({})
      return
    }

    const summaries: Record<string, RefundSummary> = {}
    refunds?.forEach((row: { order_item_id: string; quantity: number; status: string }) => {
      const current = summaries[row.order_item_id] ?? { approved: 0, pending: 0, rejected: 0 }
      if (row.status === "approved") {
        current.approved += row.quantity
      } else if (row.status === "pending") {
        current.pending += row.quantity
      } else if (row.status === "rejected") {
        current.rejected += row.quantity
      }
      summaries[row.order_item_id] = current
    })
    setRefundSummaryByItem(summaries)
  }

  const fetchOrders = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        let fetchedOrders: any[] = []
        // First try with join, if it fails, try without
        // First try with join, if it fails, try without
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*, products_belong_to(*))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[Group9] Error with join, trying without:", error)
          // Fallback: get orders without product details
          const { data: ordersOnly } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
          
          fetchedOrders = ordersOnly || []
        } else {
          fetchedOrders = data || []
        }

        setOrders(fetchedOrders)
        await loadRefundSummaries(supabase, fetchedOrders)
      } else {
        setOrders([])
        setRefundSummaryByItem({})
      }
    } catch (error) {
      console.error("[Group9] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestRefund = async (orderId: string, itemId: string) => {
    try {
      setSubmittingItem(itemId)
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Please log in",
          description: "You must be signed in to request a refund.",
          variant: "destructive",
        })
        return
      }

      const qty = selectedQty[itemId] ?? 1
      const { error } = await supabase.rpc("create_refund_request", {
        p_user_id: user.id,
        p_order_item_id: itemId,
        p_quantity: qty,
      })

      if (error) {
        toast({
          title: "Refund failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Refund requested",
        description: "We'll review your request shortly.",
      })

      await fetchOrders()
    } catch (error) {
      console.error("[Group9] Refund request error:", error)
      toast({
        title: "Refund failed",
        description: "Unexpected error requesting refund.",
        variant: "destructive",
      })
    } finally {
      setSubmittingItem(null)
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
                            {order.status === "delivered" && isWithinRefundWindow(order.created_at) ? (
                              (() => {
                                const summary = refundSummaryByItem[item.id]
                                const remaining = remainingRefundableQty(item.id, item.quantity)
                                if (summary?.approved && summary.approved >= item.quantity) {
                                  return <p className="text-xs text-green-600 mt-1">Fully refunded</p>
                                }
                                const pendingQty = summary?.pending ?? 0
                                if (pendingQty > 0 && remaining === 0) {
                                  return (
                                    <p className="text-xs text-[#ff9800] mt-1">
                                      Refund request pending ({pendingQty} item{pendingQty > 1 ? "s" : ""})
                                    </p>
                                  )
                                }
                                if (remaining <= 0) {
                                  return (
                                    <p className="text-xs text-[#ff9800] mt-1">
                                      Refund request pending ({pendingQty} item{pendingQty > 1 ? "s" : ""})
                                    </p>
                                  )
                                }
                                return (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select
                                      className="border border-black px-2 py-1 text-xs"
                                      value={selectedQty[item.id] ?? 1}
                                      onChange={(e) =>
                                        setSelectedQty((prev) => ({
                                          ...prev,
                                          [item.id]: Number(e.target.value),
                                        }))
                                      }
                                    >
                                      {Array.from({ length: remaining }, (_, i) => i + 1).map((qty) => (
                                        <option key={qty} value={qty}>
                                          {qty}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      size="sm"
                                      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black"
                                      disabled={submittingItem === item.id}
                                      onClick={() => handleRequestRefund(order.id, item.id)}
                                    >
                                      {submittingItem === item.id ? "Submitting..." : "Request Refund"}
                                    </Button>
                                  </div>
                                )
                              })()
                            ) : (
                              <p className="text-xs text-[#adb5bd] mt-1">Refund window closed</p>
                            )}
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
