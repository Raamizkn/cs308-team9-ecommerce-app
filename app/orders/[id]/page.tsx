"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Download, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refundReason, setRefundReason] = useState("")
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  const fetchOrderDetails = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(*))")
        .eq("id", params.id)
        .single()

      setOrder(data)
    } catch (error) {
      console.error("[Group9] Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for the refund request",
        variant: "destructive",
      })
      return
    }

    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          user_id: user.id,
          reason: refundReason,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast({
          title: "Request failed",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Refund requested",
        description: "Your refund request has been submitted for review",
      })

      setRefundDialogOpen(false)
      setRefundReason("")
    } catch (error) {
      console.error("[Group9] Error requesting refund:", error)
      toast({
        title: "Request failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadInvoice = () => {
    toast({
      title: "Downloading invoice",
      description: "Your invoice is being generated",
    })
    // In a real app, this would generate and download a PDF
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-8 w-8 text-[#6bcf7f]" />
      case "shipped":
        return <Truck className="h-8 w-8 text-[#4ecdc4]" />
      case "processing":
        return <Package className="h-8 w-8 text-[#ffb347]" />
      case "cancelled":
        return <XCircle className="h-8 w-8 text-[#dc3545]" />
      default:
        return <AlertCircle className="h-8 w-8 text-[#6c757d]" />
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

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d] mb-6">Order not found</p>
            <Link href="/orders">
              <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                VIEW ALL ORDERS
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/orders">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO ORDERS
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">ORDER DETAILS</h1>
          <p className="text-[#6c757d] font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                {getStatusIcon(order.status)}
                <div>
                  <h2 className="font-bold text-2xl text-[#1a1a3e]">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </h2>
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
              </div>

              {/* Status Timeline */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#6bcf7f] border-4 border-black flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">Order Placed</p>
                    <p className="text-sm text-[#6c757d]">Your order has been received</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 ${order.status !== "pending" ? "bg-[#6bcf7f]" : "bg-[#e9ecef]"} border-4 border-black flex items-center justify-center flex-shrink-0`}
                  >
                    {order.status !== "pending" && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">Processing</p>
                    <p className="text-sm text-[#6c757d]">We're preparing your items</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 ${order.status === "shipped" || order.status === "delivered" ? "bg-[#6bcf7f]" : "bg-[#e9ecef]"} border-4 border-black flex items-center justify-center flex-shrink-0`}
                  >
                    {(order.status === "shipped" || order.status === "delivered") && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">Shipped</p>
                    <p className="text-sm text-[#6c757d]">Your order is on the way</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 ${order.status === "delivered" ? "bg-[#6bcf7f]" : "bg-[#e9ecef]"} border-4 border-black flex items-center justify-center flex-shrink-0`}
                  >
                    {order.status === "delivered" && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">Delivered</p>
                    <p className="text-sm text-[#6c757d]">Order has been delivered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-6">ORDER ITEMS</h2>
              <div className="space-y-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b-4 border-[#e9ecef] last:border-0">
                    <div className="relative w-20 h-20 bg-[#4ecdc4] border-4 border-black flex-shrink-0">
                      <Image
                        src={item.products?.image_url || "/placeholder.svg"}
                        alt={item.products?.name || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#1a1a3e]">{item.products?.name}</h3>
                      <p className="text-sm text-[#6c757d]">Quantity: {item.quantity}</p>
                      <p className="font-bold text-[#5b3a8f]">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-[#1a1a3e]">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4">SHIPPING ADDRESS</h2>
              <p className="text-[#6c757d] leading-relaxed">{order.shipping_address}</p>
            </div>
          </div>

          {/* Order Summary & Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#5b3a8f] border-4 border-black p-6 pixel-shadow sticky top-24">
              <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-white mb-6">ORDER SUMMARY</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-white">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span className="font-semibold">Shipping:</span>
                  <span className="font-bold">FREE</span>
                </div>
                <div className="border-t-4 border-white pt-3">
                  <div className="flex justify-between text-white text-xl">
                    <span className="font-bold">Total:</span>
                    <span className="font-[family-name:var(--font-pixel)]">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={downloadInvoice}
                  className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  DOWNLOAD INVOICE
                </Button>

                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-white text-[#dc3545] border-4 border-black font-bold hover:bg-[#dc3545] hover:text-white">
                        REQUEST REFUND
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-4 border-black max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-bold text-2xl text-[#1a1a3e]">Request Refund</DialogTitle>
                        <DialogDescription className="text-[#6c757d]">
                          Please provide a reason for your refund request
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason" className="font-bold text-[#1a1a3e]">
                            Reason
                          </Label>
                          <Textarea
                            id="reason"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Please explain why you want a refund..."
                            className="border-4 border-black mt-2 min-h-32"
                          />
                        </div>
                        <Button
                          onClick={handleRefundRequest}
                          className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                        >
                          SUBMIT REQUEST
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
