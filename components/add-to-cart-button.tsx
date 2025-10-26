"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"

interface AddToCartButtonProps {
  product: {
    id: string
    product_id: string
    name: string
    price: number
    image_url: string
    stock: number
  }
  disabled?: boolean
}

export function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const { addItem } = useCart()

  return (
    <Button
      onClick={() => addItem(product)}
      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold pixel-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
      disabled={disabled}
    >
      {disabled ? "SOLD OUT" : "ADD"}
    </Button>
  )
}
