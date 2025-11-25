"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Star, Package, MessageSquare, ThumbsUp, Percent } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { WishlistButton } from "@/components/wishlist-button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Product {
  pid: number
  name: string
  description: string
  price: number
  stock_quantity: number
  image_url: string
  model: string
  serial_number: string
  warranty_status: string
  distributor_info: string
  rating?: number
  review_count?: number
  is_limited_edition?: boolean
  categories?: { name: string }
  discount_rate?: number | null
  discounted_price?: number | null
  has_discount?: boolean
}

interface Review {
  review_id: string
  rating: number
  comment: string
  created_at: string
  is_approved: boolean
  profiles: { name: string }
}

interface Review {
  review_id: string
  rating: number
  comment: string
  created_at: string
  is_approved: boolean
  profiles: { name: string }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`)
      const data = await response.json()

      if (data.error) {
        toast({
          title: "Product not found",
          description: data.error,
          variant: "destructive",
        })
        router.push("/catalog")
        return
      }

      setProduct(data.product)
    } catch (error) {
      console.error("[Group9] Error fetching product:", error)
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    const finalPrice = product.has_discount && product.discounted_price 
      ? product.discounted_price 
      : product.price

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.pid.toString(),
        product_id: product.pid.toString(),
        name: product.name,
        price: finalPrice,
        image_url: product.image_url || "/placeholder.svg",
        stock: product.stock_quantity,
      })
    }

    toast({
      title: "Added to cart",
      description: `${quantity} ${product.name} added to your cart ${product.has_discount ? `at $${finalPrice.toFixed(2)} (discounted!)` : ''}`,
    })
  }

  const increaseQuantity = () => {
    if (product && quantity < product.stock_quantity) {
      setQuantity(quantity + 1)
    }
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
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

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d] mb-6">Product not found</p>
            <Link href="/catalog">
              <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                BACK TO CATALOG
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const rating = product.rating || 4
  const reviewCount = product.review_count || 0
  const isLowStock = product.stock_quantity < 20 && product.stock_quantity > 0
  const isOutOfStock = product.stock_quantity === 0
  const displayPrice = product.has_discount && product.discounted_price ? product.discounted_price : product.price
  const discountPercentage = product.discount_rate ? Math.round(product.discount_rate * 100) : 0

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/catalog">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO CATALOG
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
            <div className="relative aspect-square bg-[#4ecdc4] border-4 border-black overflow-hidden">
              <Image
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
              
              {/* Top-left badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.has_discount && product.discount_rate && (
                  <div className="bg-[#6bcf7f] border-4 border-black px-4 py-2 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-black" />
                    <span className="text-sm font-bold text-black">{discountPercentage}% OFF</span>
                  </div>
                )}
                {isOutOfStock && (
                  <div className="bg-[#dc3545] border-4 border-black px-4 py-2">
                    <span className="text-sm font-bold text-white">OUT OF STOCK</span>
                  </div>
                )}
              </div>
              
              {/* Top-right badge */}
              {product.is_limited_edition && (
                <div className="absolute top-4 right-4 bg-[#ff6b9d] border-4 border-black px-4 py-2">
                  <span className="text-sm font-bold text-white">LIMITED EDITION</span>
                </div>
              )}
              
              {/* Bottom-right badge - LOW STOCK */}
              {isLowStock && !isOutOfStock && (
                <div className="absolute bottom-4 right-4 bg-[#ffb347] border-4 border-black px-4 py-2">
                  <span className="text-sm font-bold text-black">LOW STOCK</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h1 className="font-[family-name:var(--font-pixel)] text-3xl md:text-4xl text-[#1a1a3e] mb-4">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(rating) ? "fill-[#ffd93d] text-[#ffd93d]" : "fill-none text-gray-400"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[#6c757d] font-semibold">({reviewCount} reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-6">
                {product.has_discount && product.discounted_price ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-pixel)] text-4xl text-[#5b3a8f]">
                        ${product.discounted_price.toFixed(2)}
                      </span>
                      <div className="bg-[#6bcf7f] border-2 border-black px-3 py-1">
                        <span className="text-sm font-bold text-black">{discountPercentage}% OFF</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-[#6c757d] line-through">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-[#6bcf7f] font-bold">
                        Save ${(product.price - product.discounted_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="font-[family-name:var(--font-pixel)] text-4xl text-[#5b3a8f]">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-[#1a1a3e]" />
                  <span className="font-bold text-[#1a1a3e]">Stock Availability:</span>
                </div>
                <p
                  className={`text-lg font-bold ${
                    isOutOfStock
                      ? "text-[#dc3545]"
                      : isLowStock
                        ? "text-[#ffb347]"
                        : "text-[#6bcf7f]"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of Stock"
                    : isLowStock
                      ? `Only ${product.stock_quantity} left in stock!`
                      : `${product.stock_quantity} available`}
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-[#1a1a3e] mb-2">Description</h3>
                <p className="text-[#6c757d] leading-relaxed">{product.description}</p>
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="mb-6">
                  <label className="font-bold text-[#1a1a3e] mb-2 block">Quantity:</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border-4 border-black bg-white">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={decreaseQuantity}
                        className="h-12 w-12 hover:bg-[#e9ecef] border-r-4 border-black rounded-none"
                        disabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="w-16 text-center font-bold text-lg">{quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={increaseQuantity}
                        className="h-12 w-12 hover:bg-[#e9ecef] border-l-4 border-black rounded-none"
                        disabled={quantity >= product.stock_quantity}
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-sm text-[#6c757d]">
                      Max: {product.stock_quantity}
                    </span>
                  </div>
                </div>
              )}

              {/* Wishlist and Add to Cart Buttons */}
              <div className="flex items-center gap-3">
                <WishlistButton productId={product.pid.toString()} className="flex-shrink-0" />
                <Button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
                </Button>
              </div>
            </div>

            {/* Product Info */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h3 className="font-bold text-lg text-[#1a1a3e] mb-4">Product Information</h3>
              <div className="space-y-3">
                {product.model && (
                  <div className="flex justify-between">
                    <span className="text-[#6c757d] font-semibold">Model:</span>
                    <span className="text-[#1a1a3e] font-bold">{product.model}</span>
                  </div>
                )}
                {product.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-[#6c757d] font-semibold">Serial Number:</span>
                    <span className="text-[#1a1a3e] font-bold">{product.serial_number}</span>
                  </div>
                )}
                {product.warranty_status && (
                  <div className="flex justify-between">
                    <span className="text-[#6c757d] font-semibold">Warranty:</span>
                    <span className="text-[#1a1a3e] font-bold">{product.warranty_status}</span>
                  </div>
                )}
                {product.distributor_info && (
                  <div className="flex justify-between">
                    <span className="text-[#6c757d] font-semibold">Distributor:</span>
                    <span className="text-[#1a1a3e] font-bold">{product.distributor_info}</span>
                  </div>
                )}
                {product.categories?.name && (
                  <div className="flex justify-between">
                    <span className="text-[#6c757d] font-semibold">Category:</span>
                    <span className="text-[#1a1a3e] font-bold">{product.categories.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <h3 className="font-bold text-2xl text-[#1a1a3e] mb-6 flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                CUSTOMER REVIEWS
              </h3>

              {/* Write Review Button - Shows only for delivered orders */}
              <div className="mb-6 p-4 bg-[#e9ecef] border-2 border-black">
                <p className="text-sm text-[#6c757d] mb-3">
                  <strong>Note:</strong> You can only review products you've purchased and received.
                </p>
                <Button
                  className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                  onClick={() => {
                    toast({
                      title: "Feature Coming Soon",
                      description: "Reviews will be available once backend is connected. You can review products after delivery.",
                    })
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  WRITE A REVIEW
                </Button>
              </div>

              {/* Reviews List - Mock for now */}
              <div className="space-y-4">
                <div className="p-4 border-2 border-black bg-[#f8f9fa]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < 5 ? "fill-[#ffd93d] text-[#ffd93d]" : "fill-none text-gray-400"}`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-[#1a1a3e]">Sample User</span>
                      </div>
                      <p className="text-xs text-[#6c757d]">Verified Purchase</p>
                    </div>
                    <span className="text-xs text-[#6c757d]">2 days ago</span>
                  </div>
                  <p className="text-[#1a1a3e]">
                    This is a sample review. Real reviews will appear here once you connect the backend API.
                    Reviews require product manager approval before being visible.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-[#6c757d]" />
                    <span className="text-xs text-[#6c757d] font-semibold">Helpful (12)</span>
                  </div>
                </div>

                <div className="text-center p-8 border-2 border-dashed border-[#6c757d]">
                  <MessageSquare className="h-12 w-12 text-[#6c757d] mx-auto mb-3" />
                  <p className="text-[#6c757d] font-semibold">
                    No reviews yet. Be the first to review this product!
                  </p>
                  <p className="text-sm text-[#6c757d] mt-2">
                    Backend API ready - just needs to be connected to display real reviews
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

