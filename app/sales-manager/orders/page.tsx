"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ShoppingBag, Search, Package, ChevronDown, ChevronUp } from "lucide-react"

interface Order {
  order_id: number
  customer_name: string
  customer_email: string
  order_date: string
  total_amount: number
  order_status: string
  items: OrderItem[]
}

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function OrdersOverviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  useEffect(() => {
    checkAccessAndLoadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [searchTerm, statusFilter, orders])

  const checkAccessAndLoadOrders = async () => {
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

      // Load all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          order_id,
          order_date,
          total_amount,
          order_status,
          profiles!orders_customer_id_fkey (
            name,
            customers (email)
          )
        `)
        .order("order_date", { ascending: false })

      if (ordersError) throw ordersError

      // For each order, fetch order items
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { data: itemsData } = await supabase
            .from("order_items")
            .select(`
              quantity,
              unit_price,
              products (name)
            `)
            .eq("order_id", order.order_id)

          const items: OrderItem[] = (itemsData || []).map((item: any) => ({
            product_name: item.products?.name || "Unknown Product",
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
          }))

          return {
            order_id: order.order_id,
            customer_name: order.profiles?.name || "Unknown Customer",
            customer_email: order.profiles?.customers?.email || "No Email",
            order_date: order.order_date,
            total_amount: order.total_amount,
            order_status: order.order_status,
            items,
          }
        })
      )

      setOrders(ordersWithItems)
      setFilteredOrders(ordersWithItems)
    } catch (error) {
      console.error("[Group9] Error:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      })
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.order_status.toLowerCase() === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_id.toString().includes(term) ||
          order.customer_name.toLowerCase().includes(term) ||
          order.customer_email.toLowerCase().includes(term) ||
          order.items.some((item) => item.product_name.toLowerCase().includes(term))
      )
    }

    setFilteredOrders(filtered)
  }

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-[#6bcf7f] text-[#1a1a3e] border-[#1a1a3e]"
      case "in-transit":
        return "bg-[#ffb347] text-[#1a1a3e] border-[#1a1a3e]"
      case "processing":
        return "bg-[#4ecdc4] text-[#1a1a3e] border-[#1a1a3e]"
      case "cancelled":
        return "bg-[#dc3545] text-white border-[#1a1a3e]"
      default:
        return "bg-[#e9ecef] text-[#6c757d] border-[#1a1a3e]"
    }
  }

  const getOrderStats = () => {
    return {
      total: orders.length,
      processing: orders.filter((o) => o.order_status.toLowerCase() === "processing").length,
      inTransit: orders.filter((o) => o.order_status.toLowerCase() === "in-transit").length,
      delivered: orders.filter((o) => o.order_status.toLowerCase() === "delivered").length,
      cancelled: orders.filter((o) => o.order_status.toLowerCase() === "cancelled").length,
    }
  }

  const stats = getOrderStats()

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
            ORDER OVERVIEW
          </h1>
          <p className="text-[#6c757d] font-semibold">View all orders and order details</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#6c757d] mb-1">TOTAL ORDERS</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.total}
            </div>
          </div>
          <div className="bg-[#4ecdc4] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">PROCESSING</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.processing}
            </div>
          </div>
          <div className="bg-[#ffb347] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">IN TRANSIT</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.inTransit}
            </div>
          </div>
          <div className="bg-[#6bcf7f] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">DELIVERED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.delivered}
            </div>
          </div>
          <div className="bg-[#dc3545] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-white mb-1">CANCELLED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-white">
              {stats.cancelled}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-4 border-black p-4 pixel-shadow-sm mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6c757d]" />
              <Input
                type="text"
                placeholder="Search by order ID, customer, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-4 border-black"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border-4 border-black font-bold bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="processing">Processing</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
              <ShoppingBag className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
              <p className="text-2xl font-bold text-[#6c757d] mb-2">No orders found</p>
              <p className="text-[#6c757d]">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Orders will appear here once customers start purchasing"}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.order_id} className="bg-white border-4 border-black pixel-shadow-sm">
                <div
                  className="p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                  onClick={() => toggleOrderExpansion(order.order_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-grow">
                      <div className="bg-[#ff6b9d] border-2 border-black p-3">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">
                            ORDER #{order.order_id.toString().padStart(6, "0")}
                          </span>
                          <span
                            className={`px-3 py-1 text-xs font-bold border-2 ${getStatusColor(
                              order.order_status
                            )}`}
                          >
                            {order.order_status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#6c757d]">
                          <span className="font-bold">{order.customer_name}</span>
                          <span>{order.customer_email}</span>
                          <span>{formatDate(order.order_date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                          ${order.total_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-[#6c757d]">{order.items.length} item(s)</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border-2 border-black"
                      >
                        {expandedOrderId === order.order_id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Order Details */}
                {expandedOrderId === order.order_id && (
                  <div className="border-t-4 border-black p-4 bg-[#f8f9fa]">
                    <h3 className="font-bold text-lg text-[#1a1a3e] mb-3">ORDER ITEMS</h3>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white border-2 border-black"
                        >
                          <div className="flex-grow">
                            <div className="font-bold text-[#1a1a3e]">{item.product_name}</div>
                            <div className="text-sm text-[#6c757d]">
                              Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-[family-name:var(--font-pixel)] text-lg text-[#1a1a3e]">
                            ${item.total_price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

