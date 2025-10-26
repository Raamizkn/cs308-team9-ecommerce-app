"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react"

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart()
  const [discountCode, setDiscountCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [discountError, setDiscountError] = useState("")

  const applyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code")
      return
    }

    try {
      const response = await fetch(`/api/discount?code=${discountCode}`)
      const data = await response.json()

      if (data.error) {
        setDiscountError(data.error)
        setDiscount(0)
      } else {
        setDiscount(data.discount_percentage)
        setDiscountError("")
      }
    } catch (error) {
      console.error("[Group9] Error applying discount:", error)
      setDiscountError("Failed to apply discount code")
    }
  }

  const discountAmount = (totalPrice * discount) / 100
  const finalTotal = totalPrice - discountAmount

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              CONTINUE SHOPPING
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">YOUR CART</h1>
          <p className="text-[#6c757d] font-semibold">
            {items.length === 0 ? "Your cart is empty" : `${items.length} items in your cart`}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d] mb-6">No items in cart</p>
            <Link href="/">
              <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                START SHOPPING
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.product_id} className="bg-white border-4 border-black p-4 pixel-shadow-sm">
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 bg-[#4ecdc4] border-4 border-black flex-shrink-0">
                      <Image src={item.image_url || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-[#1a1a3e] mb-2 line-clamp-2">{item.name}</h3>
                      <p className="font-[family-name:var(--font-pixel)] text-xl text-[#5b3a8f] mb-3">
                        ${item.price.toFixed(2)}
                      </p>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border-4 border-black">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="h-10 w-10 hover:bg-[#e9ecef] border-r-4 border-black rounded-none"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-bold">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="h-10 w-10 hover:bg-[#e9ecef] border-l-4 border-black rounded-none"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          onClick={() => removeItem(item.product_id)}
                          className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-xl text-[#1a1a3e]">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                onClick={clearCart}
                variant="outline"
                className="w-full border-4 border-black text-[#dc3545] hover:bg-[#dc3545] hover:text-white font-bold bg-transparent"
              >
                CLEAR CART
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#5b3a8f] border-4 border-black p-6 pixel-shadow sticky top-24">
                <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-white mb-6">ORDER SUMMARY</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-white">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="font-bold">${totalPrice.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[#6bcf7f]">
                      <span className="font-semibold">Discount ({discount}%):</span>
                      <span className="font-bold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t-4 border-white pt-4">
                    <div className="flex justify-between text-white text-xl">
                      <span className="font-bold">Total:</span>
                      <span className="font-[family-name:var(--font-pixel)]">${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Discount Code */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-2">Discount Code</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase())
                        setDiscountError("")
                      }}
                      className="border-4 border-black bg-white font-semibold"
                    />
                    <Button
                      onClick={applyDiscount}
                      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                    >
                      APPLY
                    </Button>
                  </div>
                  {discountError && <p className="text-[#ff6b9d] text-sm font-semibold mt-2">{discountError}</p>}
                  {discount > 0 && (
                    <p className="text-[#6bcf7f] text-sm font-semibold mt-2">Discount applied successfully!</p>
                  )}
                </div>

                <Link href="/checkout">
                  <Button className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow-sm">
                    PROCEED TO CHECKOUT
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
