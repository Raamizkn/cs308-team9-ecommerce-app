"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export default function OrderManagementPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(*))")
        .order("created_at", { ascending: false })

      setOrders(data || [])
    } catch (error) {
      console.error("[Group9] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId)

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Status updated",
        description: "Order status has been updated successfully",
      })

      fetchOrders()
    } catch (error) {
      console.error("[Group9] Error updating order:", error)
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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">ORDER MANAGEMENT</h1>
          <p className="text-[#6c757d] font-semibold">{orders.length} total orders</p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <p className="font-bold text-xl text-[#1a1a3e] mb-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-[#6c757d]">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                    <SelectTrigger className="w-40 border-4 border-black font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">PENDING</SelectItem>
                      <SelectItem value="processing">PROCESSING</SelectItem>
                      <SelectItem value="shipped">SHIPPED</SelectItem>
                      <SelectItem value="delivered">DELIVERED</SelectItem>
                      <SelectItem value="cancelled">CANCELLED</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-[family-name:var(--font-pixel)] text-xl text-[#5b3a8f]">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t-4 border-[#e9ecef] pt-4 mb-4">
                <p className="text-sm font-bold text-[#1a1a3e] mb-2">ITEMS:</p>
                <ul className="space-y-1">
                  {order.order_items?.map((item: any) => (
                    <li key={item.id} className="text-sm text-[#6c757d]">
                      {item.products?.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-[#6c757d]">
                  <span className="font-bold">Shipping:</span> {order.shipping_address}
                </p>
                <Link href={`/orders/${order.id}`}>
                  <Button className="bg-[#4ecdc4] hover:bg-[#3dbdb4] text-black border-4 border-black font-bold">
                    <Eye className="h-4 w-4 mr-2" />
                    VIEW DETAILS
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
