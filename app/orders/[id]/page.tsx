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
import { pdf } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/invoice-pdf"

interface RefundSummary {
  approved: number
  pending: number
  rejected: number
}

const getProductImage = (productName: string | undefined, currentImageUrl: string | null) => {
  if (!productName) return "/placeholder.svg"
  if (productName === 'Time Turner Necklace') return '/time-turner-necklace.png'
  if (productName === 'Drago Nova Transforming Bakugan') return '/drago-nova-bakugan.png'
  if (productName === 'Elder Wand Replica') return '/elder-wand-replica.png'
  if (productName === 'Charizard VMAX Battle Deck') return '/charizard.png'
  if (productName === 'Pikachu Plush (24 inch)') return '/pokemon.png'
  if (productName === 'Skellige Faction Card Set') return '/skellige_card_set.png'
  return currentImageUrl || '/placeholder.svg'
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refundSummaryByItem, setRefundSummaryByItem] = useState<Record<string, RefundSummary>>({})
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [submittingItem, setSubmittingItem] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

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

  const loadRefundSummaries = async (supabaseClient: any, orderData: any) => {
    if (!orderData?.order_items) {
      setRefundSummaryByItem({})
      return
    }

    const itemIds = orderData.order_items.map((item: any) => item.id)

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

  const fetchOrderDetails = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products_belong_to(*))")
        .eq("id", params.id)
        .single()

      // Ensure we have tax_amount, subtotal, and total (for older orders, calculate if missing)
      if (data) {
        if (!data.tax_amount && data.subtotal) {
          // Calculate tax if missing (20% of subtotal)
          data.tax_amount = data.subtotal * 0.20
        }
        if (!data.subtotal && data.order_items) {
          // Calculate subtotal if missing
          data.subtotal = data.order_items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
        }
        if (!data.total && data.subtotal && data.tax_amount !== undefined) {
          // Calculate total if missing
          data.total = data.subtotal + data.tax_amount
        }
      }

      setOrder(data)
      if (data) {
        await loadRefundSummaries(supabase, data)
      }
    } catch (error) {
      console.error("[Group9] Error fetching order:", error)
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

      await fetchOrderDetails()
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

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true)
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", order_id: order.id }),
      })

      const data = await response.json()
      if (data.error) {
        toast({ title: "Cannot cancel", description: data.error, variant: "destructive" })
        return
      }

      toast({ title: "Order cancelled", description: "Your order was cancelled successfully" })
      await fetchOrderDetails()
    } catch (error) {
      console.error("[Group9] Error cancelling order:", error)
      toast({ title: "Cancel failed", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setIsCancelling(false)
    }
  }

  const downloadInvoice = async () => {
    if (!order) return

    setDownloadingPdf(true)
    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch customer information - prioritize profile details as universal source
      // Profile is the source of truth for user information (matches email invoice logic)
      let customerName = "Customer"
      let customerEmail = "customer@pixelvault.com"

      // First, try to get from profiles table (universal source)
      if (order.user_id) {
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("uid", order.user_id)
            .maybeSingle()

          if (profileData) {
            // Use profile name if it exists and is not empty/default
            if (profileData.name && profileData.name.trim() !== "" && profileData.name !== "User") {
              customerName = profileData.name
            }
            // Use profile email if it exists
            if (profileData.email && profileData.email.trim() !== "") {
              customerEmail = profileData.email
            }
          }

          // Fallback: try API endpoint if profile didn't have name
          if (customerName === "Customer") {
            try {
              const response = await fetch(`/api/users?user_id=${order.user_id}`)
              if (response.ok) {
                const userData = await response.json()
                if (userData.name && userData.name.trim() !== "" && userData.name !== "User") {
                  customerName = userData.name
                }
                if (userData.email && (!customerEmail || customerEmail === "customer@pixelvault.com")) {
                  customerEmail = userData.email
                }
              }
            } catch (error) {
              console.error("[Group9] Error fetching user info:", error)
            }
          }

          // Final fallback: try to get from current user if it matches
          if (customerName === "Customer") {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (currentUser && currentUser.id === order.user_id) {
              if (!customerEmail || customerEmail === "customer@pixelvault.com") {
                customerEmail = currentUser.email || customerEmail
              }
              if (currentUser.user_metadata?.name) {
                customerName = currentUser.user_metadata.name
              } else if (currentUser.email) {
                customerName = currentUser.email.split("@")[0]
              }
            }
          }
        } catch (error) {
          console.error("[Group9] Error fetching customer info:", error)
        }
      }

      // Final fallback: use checkout form details stored in order if profile doesn't have the info
      if (!customerName || customerName === "Customer" || customerName.trim() === "") {
        customerName = order.customer_name || "Customer"
      }
      if (!customerEmail || customerEmail === "customer@pixelvault.com") {
        customerEmail = order.customer_email || customerEmail
      }

      // Use tax_amount, subtotal, and total from order (already calculated and stored)
      const subtotal = order.subtotal || order.order_items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0
      const shipping = 0
      const tax = order.tax_amount || 0
      const total = order.total || subtotal + tax

      // Prepare invoice data with dynamic values
      // Handle both products_belong_to and products field names (depending on Supabase relationship setup)
      const invoiceData = {
        orderId: order.id,
        orderDate: order.created_at,
        customerName: customerName,
        customerEmail: customerEmail,
        shippingAddress: order.shipping_address || "N/A",
        items: order.order_items?.map((item: any) => ({
          id: item.id,
          product_name: item.products_belong_to?.name || item.products?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })) || [],
        subtotal,
        shipping,
        tax,
        total,
        status: order.status,
        paymentMethod: order.payment_method || "Credit Card",
      }

      // Generate PDF
      const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob()

      // Download PDF
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `pixelvault-invoice-${order.id.substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Invoice downloaded",
        description: "Your invoice has been saved successfully",
      })
    } catch (error) {
      console.error("[Group9] Error generating invoice:", error)
      toast({
        title: "Download failed",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPdf(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-8 w-8 text-[#6bcf7f]" />
      case "in-transit":
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
                    className={`w-8 h-8 ${order.status === "processing" || order.status === "in-transit" || order.status === "delivered" ? "bg-[#6bcf7f]" : "bg-[#e9ecef]"} border-4 border-black flex items-center justify-center flex-shrink-0`}
                  >
                    {(order.status === "processing" || order.status === "in-transit" || order.status === "delivered") && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">Processing</p>
                    <p className="text-sm text-[#6c757d]">We're preparing your items</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 ${order.status === "in-transit" || order.status === "delivered" ? "bg-[#6bcf7f]" : "bg-[#e9ecef]"} border-4 border-black flex items-center justify-center flex-shrink-0`}
                  >
                    {(order.status === "in-transit" || order.status === "delivered") && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1a1a3e]">In-Transit</p>
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
                  <div key={item.id} className="pb-4 border-b-4 border-[#e9ecef] last:border-0">
                    <div className="flex gap-4 mb-2">
                      <div className="relative w-20 h-20 bg-[#2a9d8f] border-4 border-black flex-shrink-0">
                        <Image
                          src={getProductImage(item.products_belong_to?.name, item.products_belong_to?.image_url)}
                          alt={item.products_belong_to?.name || "Product"}
                          fill
                          className="object-contain"
                          style={{ objectPosition: 'center' }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#1a1a3e]">{item.products_belong_to?.name}</h3>
                        <p className="text-sm text-[#6c757d]">Quantity: {item.quantity}</p>
                        <p className="font-bold text-[#5b3a8f]">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-[#1a1a3e]">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                    {/* Refund Controls */}
                    {order.status === "delivered" && isWithinRefundWindow(order.created_at) ? (
                      (() => {
                        const summary = refundSummaryByItem[item.id]
                        const remaining = remainingRefundableQty(item.id, item.quantity)
                        const pendingQty = summary?.pending ?? 0
                        const approvedQty = summary?.approved ?? 0

                        // Show fully refunded if all items are approved
                        if (approvedQty >= item.quantity) {
                          return (
                            <div className="mt-3 ml-24 bg-[#d4edda] border-2 border-[#28a745] p-3 flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-[#155724]" />
                              <p className="text-sm font-bold text-[#155724]">FULLY REFUNDED</p>
                            </div>
                          )
                        }

                        // Show refund controls with pending/approved info
                        return (
                          <div className="mt-2 ml-24 space-y-1">
                            {pendingQty > 0 && (
                              <div className="bg-[#fff3cd] border-2 border-[#ff9800] p-3 flex items-center gap-2">
                                <div className="animate-pulse">⏳</div>
                                <p className="text-sm font-bold text-[#856404]">
                                  REFUND REQUEST PENDING: {pendingQty} item{pendingQty > 1 ? "s" : ""} awaiting review
                                </p>
                              </div>
                            )}
                            {/* Show approved refund info if exists */}
                            {approvedQty > 0 && (
                              <div className="bg-[#d4edda] border-2 border-[#28a745] p-3 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-[#155724]" />
                                <p className="text-sm font-bold text-[#155724]">
                                  {approvedQty} item{approvedQty > 1 ? "s" : ""} REFUNDED
                                </p>
                              </div>
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
                              </div>
                            ) : pendingQty > 0 ? (
                              <p className="text-xs text-[#ff9800] mt-1">
                                All items have refund requests pending review
                              </p>
                            ) : null}
                          </div>
                        )
                      })()
                    ) : order.status === "delivered" ? (
                      <p className="text-xs text-[#adb5bd] mt-2 ml-24">Refund window closed</p>
                    ) : null}
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
                  <span className="font-bold">
                    ${(order.subtotal ?? (order.total / 1.2)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-white">
                  <span className="font-semibold">Tax (20%):</span>
                  <span className="font-bold">
                    ${(order.tax_amount ?? (order.total - (order.total / 1.2))).toFixed(2)}
                  </span>
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
                  disabled={downloadingPdf}
                  className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                >
                  {downloadingPdf ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      DOWNLOAD INVOICE
                    </>
                  )}
                </Button>


                {order.status === "processing" && (
                  <Button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="w-full bg-white text-[#1a1a3e] border-4 border-black font-bold hover:bg-[#e9ecef]"
                  >
                    {isCancelling ? "CANCELLING..." : "CANCEL ORDER"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
