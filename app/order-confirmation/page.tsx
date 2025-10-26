"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id")
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      // In a real app, fetch order details from API
      setOrderDetails({ id: orderId })
    }
  }, [orderId])

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white border-4 border-black p-12 pixel-shadow">
            <div className="mb-6">
              <CheckCircle className="h-24 w-24 text-[#6bcf7f] mx-auto mb-4" />
              <h1 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e] mb-4">ORDER CONFIRMED!</h1>
              <p className="text-lg text-[#6c757d] font-semibold mb-2">Thank you for your purchase</p>
              {orderId && (
                <p className="text-sm text-[#6c757d]">
                  Order ID: <span className="font-bold text-[#5b3a8f]">{orderId}</span>
                </p>
              )}
            </div>

            <div className="bg-[#4ecdc4] border-4 border-black p-6 mb-8">
              <p className="text-[#1a1a3e] font-semibold leading-relaxed">
                Your order has been successfully placed! You will receive a confirmation email shortly with your order
                details and tracking information.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                  CONTINUE SHOPPING
                </Button>
              </Link>
              <Link href="/orders">
                <Button className="bg-[#5b3a8f] hover:bg-[#3d2660] text-white border-4 border-black font-bold text-lg px-8 py-6">
                  VIEW ORDERS
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa]">
          <PixelHeader />
          <div className="flex items-center justify-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  )
}
