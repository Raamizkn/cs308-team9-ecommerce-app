"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useOrders, useRefundSummaries } from "@/hooks/useOrders"
import { Package, User, LogOut, Eye, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { type RefundSummary } from "@/lib/orders/fetchOrders"

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [submittingItem, setSubmittingItem] = useState<string | null>(null)

  // Fetch user auth info
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      // Check if user is a support agent, sales manager, or product manager
      const [supportAgent, salesManager, productManager] = await Promise.all([
        supabase.from("support_agents").select("uid").eq("uid", authUser.id).maybeSingle(),
        supabase.from("sales_managers").select("uid").eq("uid", authUser.id).maybeSingle(),
        supabase.from("product_managers").select("uid").eq("uid", authUser.id).maybeSingle(),
      ])

      if (supportAgent.data) {
        router.push("/admin/chat")
        return
      }

      if (salesManager.data) {
        router.push("/sales-manager/dashboard")
        return
      }

      if (productManager.data) {
        router.push("/product-manager")
        return
      }

      // If user is a regular customer, proceed
      setUserId(authUser.id)
      const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single()
      setUser(data || { email: authUser.email, name: authUser.user_metadata?.name })
    } catch (error) {
      console.error("[Group9] Error checking auth:", error)
      router.push("/")
    }
  }

  // Use SWR hooks for orders and refund summaries
  const { orders, isLoading: ordersLoading, mutate: mutateOrders } = useOrders(userId)

  // Get all item IDs from orders
  const itemIds = useMemo(
    () => orders.flatMap((order: any) => order.order_items?.map((item: any) => item.id) ?? []),
    [orders]
  )

  // Fetch refund summaries
  const { summaries: refundSummaryByItem } = useRefundSummaries(itemIds.length > 0 ? itemIds : null)

  const loading = !userId || ordersLoading

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

  const handleRequestRefund = async (orderId: string, itemId: string) => {
    try {
      setSubmittingItem(itemId)
      const supabase = getSupabaseBrowserClient()

      if (!userId) {
        toast({
          title: "Please log in",
          description: "You must be signed in to request a refund.",
          variant: "destructive",
        })
        return
      }

      const qty = selectedQty[itemId] ?? 1
      const { error } = await supabase.rpc("create_refund_request", {
        p_user_id: userId,
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

      // Revalidate orders and refund summaries
      mutateOrders()
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
      case "in-transit":
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
                            {item.products_belong_to?.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                            {order.status === "delivered" && isWithinRefundWindow(order.created_at) ? (
                              (() => {
                                const summary = refundSummaryByItem[item.id]
                                const remaining = remainingRefundableQty(item.id, item.quantity)
                                const pendingQty = summary?.pending ?? 0
                                const approvedQty = summary?.approved ?? 0

                                // Show fully refunded if all items are approved
                                if (approvedQty >= item.quantity) {
                                  return <p className="text-xs text-green-600 mt-1">Fully refunded</p>
                                }

                                // Show refund controls with pending/approved info
                                return (
                                  <div className="mt-2 space-y-1">
                                    {/* Show pending refund info if exists */}
                                    {pendingQty > 0 && (
                                      <p className="text-xs text-[#ff9800] font-semibold">
                                        ⏳ Refund request pending: {pendingQty} item{pendingQty > 1 ? "s" : ""} awaiting review
                                      </p>
                                    )}
                                    {/* Show approved refund info if exists */}
                                    {approvedQty > 0 && (
                                      <p className="text-xs text-green-600 font-semibold">
                                        ✓ {approvedQty} item{approvedQty > 1 ? "s" : ""} refunded
                                      </p>
                                    )}
                                    {/* Show refund controls if there's remaining quantity */}
                                    {remaining > 0 ? (
                                      <div className="flex flex-wrap items-center gap-2">
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
                                        {(() => {
                                          const productId = item.products_belong_to?.pid || item.product_id
                                          return productId ? (
                                            <Link href={`/products/${productId}`}>
                                              <Button
                                                size="sm"
                                                className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-[#1a1a3e] border-4 border-black"
                                              >
                                                <Star className="h-3 w-3 mr-1" />
                                                Review
                                              </Button>
                                            </Link>
                                          ) : null
                                        })()}
                                      </div>
                                    ) : pendingQty > 0 ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-xs text-[#ff9800] mt-1">
                                          All items have refund requests pending review
                                        </p>
                                        {(() => {
                                          const productId = item.products_belong_to?.pid || item.product_id
                                          return productId ? (
                                            <Link href={`/products/${productId}`}>
                                              <Button
                                                size="sm"
                                                className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-[#1a1a3e] border-4 border-black"
                                              >
                                                <Star className="h-3 w-3 mr-1" />
                                                Review
                                              </Button>
                                            </Link>
                                          ) : null
                                        })()}
                                      </div>
                                    ) : (
                                      // Show review button even when no refund option
                                      (() => {
                                        const productId = item.products_belong_to?.pid || item.product_id
                                        return productId ? (
                                          <Link href={`/products/${productId}`}>
                                            <Button
                                              size="sm"
                                              className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-[#1a1a3e] border-4 border-black"
                                            >
                                              <Star className="h-3 w-3 mr-1" />
                                              Review
                                            </Button>
                                          </Link>
                                        ) : null
                                      })()
                                    )}
                                  </div>
                                )
                              })()
                            ) : order.status === "delivered" ? (
                              // Show review button for delivered orders outside refund window
                              (() => {
                                const productId = item.products_belong_to?.pid || item.product_id
                                return productId ? (
                                  <div className="mt-2">
                                    <Link href={`/products/${productId}`}>
                                      <Button
                                        size="sm"
                                        className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-[#1a1a3e] border-4 border-black"
                                      >
                                        <Star className="h-3 w-3 mr-1" />
                                        Review
                                      </Button>
                                    </Link>
                                  </div>
                                ) : null
                              })()
                            ) : null}
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
