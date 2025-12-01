"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface RefundRequest {
  id: string // UUID
  order_item_id: string // UUID
  quantity: number
  status: string
  // Joined data
  order_id: string
  order_created_at: string
  order_status: string
  product_id: number
  product_name: string
  item_price: number
  item_quantity: number // original quantity in order
  refund_amount: number // calculated: item_price * refund_requests.quantity
  customer_id: string
  customer_name: string
}

export default function RefundRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    checkAccessAndLoadRefunds()
  }, [])

  const checkAccessAndLoadRefunds = async () => {
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

      await loadRefunds()
    } catch (error) {
      console.error("[Group9] Error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const loadRefunds = async () => {
    try {
      const supabase = getSupabaseBrowserClient()

      // Load refund requests with related data through order_items
      const { data: refundsData, error: refundsError } = await supabase
        .from("refund_requests")
        .select(`
          id,
          order_item_id,
          quantity,
          status,
          order_items!inner (
            id,
            order_id,
            product_id,
            quantity,
            price,
            orders!inner (
              id,
              user_id,
              status,
              created_at
            ),
            products_belong_to!inner (
              pid,
              name
            )
          )
        `)
        .order("id", { ascending: false })

      if (refundsError) {
        console.error("[Group9] Error loading refunds:", refundsError)
        throw refundsError
      }

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set((refundsData || []).map((refund: any) => refund.order_items?.orders?.user_id).filter(Boolean))]
      const profilesMap: Record<string, string | null> = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", userIds)
        
        if (profilesError) {
          console.error("[Group9] Error fetching profiles:", profilesError)
        }
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = profile.name
          })
        }
      }

      // Format the data to match our interface
      const formattedRefunds: RefundRequest[] = (refundsData || []).map((refund: any) => {
        const orderItem = refund.order_items
        const order = orderItem?.orders
        const product = orderItem?.products_belong_to
        
        if (!order || !product) {
          console.error("[Group9] Missing order or product data for refund:", refund.id)
          return null
        }
        
        const customerName = order.user_id ? (profilesMap[order.user_id] || null) : null
        
        // Calculate refund amount
        const refundAmount = parseFloat(orderItem.price || 0) * (refund.quantity || 0)

        return {
          id: refund.id,
          order_item_id: refund.order_item_id,
          quantity: refund.quantity,
          status: refund.status,
          order_id: order.id,
          order_created_at: order.created_at,
          order_status: order.status,
          product_id: product.pid,
          product_name: product.name || "Unknown Product",
          item_price: parseFloat(orderItem.price || 0),
          item_quantity: orderItem.quantity || 0,
          refund_amount: refundAmount,
          customer_id: order.user_id || "",
          customer_name: customerName || "Unknown Customer",
        }
      }).filter((refund): refund is RefundRequest => refund !== null)

      setRefunds(formattedRefunds)
    } catch (error) {
      console.error("[Group9] Error loading refunds:", error)
      toast({
        title: "Error",
        description: "Failed to load refund requests",
        variant: "destructive",
      })
    }
  }

  const handleRefundDecision = async (refundId: string, approve: boolean) => {
    // This function will be implemented in the next step
    // For now, just show a message that this feature is not yet implemented
    toast({
      title: "Not implemented",
      description: "Refund approval/rejection will be implemented in the next step.",
      variant: "default",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDaysFromPurchase = (orderDate: string) => {
    const order = new Date(orderDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - order.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const isWithinRefundWindow = (orderDate: string) => {
    return getDaysFromPurchase(orderDate) <= 30
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-[#6bcf7f] text-[#1a1a3e]"
      case "rejected":
        return "bg-[#dc3545] text-white"
      case "pending":
        return "bg-[#ffb347] text-[#1a1a3e]"
      default:
        return "bg-[#e9ecef] text-[#6c757d]"
    }
  }

  const filteredRefunds = refunds.filter((refund) => {
    if (statusFilter === "all") return true
    return refund.status.toLowerCase() === statusFilter
  })

  const getRefundStats = () => {
    return {
      total: refunds.length,
      pending: refunds.filter((r) => r.status.toLowerCase() === "pending").length,
      approved: refunds.filter((r) => r.status.toLowerCase() === "approved").length,
      rejected: refunds.filter((r) => r.status.toLowerCase() === "rejected").length,
    }
  }

  const stats = getRefundStats()

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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
            REFUND REQUESTS
          </h1>
          <p className="text-[#6c757d] font-semibold">Evaluate and process customer refund requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#6c757d] mb-1">TOTAL REQUESTS</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.total}
            </div>
          </div>
          <div className="bg-[#ffb347] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">PENDING</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.pending}
            </div>
          </div>
          <div className="bg-[#6bcf7f] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">APPROVED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.approved}
            </div>
          </div>
          <div className="bg-[#dc3545] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-white mb-1">REJECTED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-white">
              {stats.rejected}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white border-4 border-black p-4 pixel-shadow-sm mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border-4 border-black font-bold bg-white"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Info Box */}
        <div className="bg-[#fff3cd] border-4 border-black p-4 pixel-shadow-sm mb-6">
          <p className="text-sm font-bold text-[#856404] flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>
              Refunds can only be processed within 30 days of purchase and only for delivered products.
              The refunded amount will be returned to the customer's account, and the product will be
              added back to stock.
            </span>
          </p>
        </div>

        {/* Refund Requests List */}
        <div className="space-y-4">
          {filteredRefunds.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
              <TrendingUp className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
              <p className="text-2xl font-bold text-[#6c757d] mb-2">No refund requests</p>
              <p className="text-[#6c757d]">
                {statusFilter !== "all"
                  ? `No ${statusFilter} refund requests found`
                  : "Refund requests will appear here"}
              </p>
            </div>
          ) : (
            filteredRefunds.map((refund) => {
              const daysFromPurchase = getDaysFromPurchase(refund.order_created_at)
              const withinWindow = isWithinRefundWindow(refund.order_created_at)
              const isPending = refund.status.toLowerCase() === "pending"

              return (
                <div
                  key={refund.id}
                  className={`bg-white border-4 border-black pixel-shadow-sm ${
                    !withinWindow ? "opacity-75" : ""
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                            REFUND #{refund.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`px-3 py-1 text-xs font-bold border-2 border-black ${getStatusColor(
                              refund.status
                            )}`}
                          >
                            {refund.status.toUpperCase()}
                          </span>
                          {!withinWindow && (
                            <span className="bg-[#ffc107] text-[#1a1a3e] px-3 py-1 text-xs font-bold border-2 border-black">
                              OUTSIDE 30-DAY WINDOW
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#6c757d] space-y-1">
                          <div>
                            <span className="font-bold">Order:</span> #{refund.order_id.slice(0, 8).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold">Requested:</span> {formatDate(refund.order_created_at)}
                          </div>
                          <div>
                            <span className="font-bold">Days from purchase:</span> {daysFromPurchase} days
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
                          ${refund.refund_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-[#6c757d]">Refund Amount</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-[#f8f9fa] border-2 border-black">
                      <div>
                        <div className="text-xs font-bold text-[#6c757d] mb-1">CUSTOMER</div>
                        <div className="font-bold text-[#1a1a3e]">{refund.customer_name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#6c757d] mb-1">PRODUCT</div>
                        <div className="font-bold text-[#1a1a3e]">{refund.product_name}</div>
                        <div className="text-sm text-[#6c757d]">Quantity: {refund.quantity} (of {refund.item_quantity} ordered)</div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-3 pt-4 border-t-2 border-black">
                        <Button
                          onClick={() => handleRefundDecision(refund.id, true)}
                          disabled={processing === refund.id || !withinWindow}
                          className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-4 border-black font-bold"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {processing === refund.id ? "PROCESSING..." : "APPROVE REFUND"}
                        </Button>
                        <Button
                          onClick={() => handleRefundDecision(refund.id, false)}
                          disabled={processing === refund.id}
                          className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black font-bold"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {processing === refund.id ? "PROCESSING..." : "REJECT REFUND"}
                        </Button>
                        {!withinWindow && (
                          <span className="text-sm text-[#dc3545] font-bold flex items-center gap-1 ml-2">
                            <Clock className="h-4 w-4" />
                            Refund window expired
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}


