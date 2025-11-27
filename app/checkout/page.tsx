"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if user is logged in (client-side check)
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      console.log("[Group9] Client-side: User check before order:", user?.id || "NOT LOGGED IN")

      // Create order
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies so server can read session
        body: JSON.stringify({
          items,
          total: totalPrice,
          shipping_address: `${formData.address}, ${formData.city}, ${formData.zipCode}, ${formData.country}`,
          payment_method: "Credit Card",
          customer_email: formData.email,
          customer_name: formData.name,
        }),
      })

      const data = await response.json()
      console.log("[Group9] Client-side: Order response:", data)

      if (data.error) {
        toast({
          title: "Order failed",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      // Clear cart and redirect
      clearCart()
      toast({
        title: "Order placed successfully!",
        description: `Order #${data.order_id} has been created`,
      })

      router.push(`/order-confirmation?id=${data.order_id}`)
    } catch (error) {
      console.error("[Group9] Error placing order:", error)
      toast({
        title: "Order failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d] mb-6">Your cart is empty</p>
            <Link href="/">
              <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                START SHOPPING
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
          <Link href="/cart">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO CART
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">CHECKOUT</h1>
          <p className="text-[#6c757d] font-semibold">Complete your order</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Shipping Information */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-6">SHIPPING INFORMATION</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="font-bold text-[#1a1a3e]">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="font-bold text-[#1a1a3e]">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address" className="font-bold text-[#1a1a3e]">
                    Address *
                  </Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="font-bold text-[#1a1a3e]">
                    City *
                  </Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode" className="font-bold text-[#1a1a3e]">
                    ZIP Code *
                  </Label>
                  <Input
                    id="zipCode"
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="country" className="font-bold text-[#1a1a3e]">
                    Country *
                  </Label>
                  <Input
                    id="country"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-6">PAYMENT INFORMATION</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber" className="font-bold text-[#1a1a3e]">
                    Card Number *
                  </Label>
                  <Input
                    id="cardNumber"
                    required
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="border-4 border-black mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardExpiry" className="font-bold text-[#1a1a3e]">
                      Expiry Date *
                    </Label>
                    <Input
                      id="cardExpiry"
                      required
                      placeholder="MM/YY"
                      value={formData.cardExpiry}
                      onChange={(e) => setFormData({ ...formData, cardExpiry: e.target.value })}
                      className="border-4 border-black mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardCvv" className="font-bold text-[#1a1a3e]">
                      CVV *
                    </Label>
                    <Input
                      id="cardCvv"
                      required
                      placeholder="123"
                      value={formData.cardCvv}
                      onChange={(e) => setFormData({ ...formData, cardCvv: e.target.value })}
                      className="border-4 border-black mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow"
            >
              {loading ? "PROCESSING..." : "PLACE ORDER"}
            </Button>
          </form>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#5b3a8f] border-4 border-black p-6 pixel-shadow sticky top-24">
              <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-white mb-6">ORDER SUMMARY</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-white">
                    <span className="font-semibold">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-4 border-white pt-4">
                <div className="flex justify-between text-white text-xl">
                  <span className="font-bold">Total:</span>
                  <span className="font-[family-name:var(--font-pixel)]">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
