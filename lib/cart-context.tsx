"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  image_url: string
  quantity: number
  stock: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Omit<CartItem, "quantity">) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const { toast } = useToast()

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("pixelvault-cart")
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("[Group9] Error loading cart:", error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("pixelvault-cart", JSON.stringify(items))
  }, [items])

  const addItem = (product: Omit<CartItem, "quantity">) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.product_id === product.product_id)

      if (existingItem) {
        // Check stock limit
        if (existingItem.quantity >= product.stock) {
          toast({
            title: "Stock limit reached",
            description: `Only ${product.stock} items available`,
            variant: "destructive",
          })
          return currentItems
        }

        toast({
          title: "Updated cart",
          description: `${product.name} quantity increased`,
        })

        return currentItems.map((item) =>
          item.product_id === product.product_id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      toast({
        title: "Added to cart",
        description: `${product.name} added to your cart`,
      })

      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  const removeItem = (productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.product_id !== productId))
    toast({
      title: "Removed from cart",
      description: "Item removed from your cart",
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId)
      return
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.product_id === productId) {
          if (quantity > item.stock) {
            toast({
              title: "Stock limit reached",
              description: `Only ${item.stock} items available`,
              variant: "destructive",
            })
            return item
          }
          return { ...item, quantity }
        }
        return item
      }),
    )
  }

  const clearCart = () => {
    setItems([])
    toast({
      title: "Cart cleared",
      description: "All items removed from cart",
    })
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
