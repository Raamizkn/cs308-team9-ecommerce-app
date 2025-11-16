"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Star, Package } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"

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

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.pid.toString(),
        product_id: product.pid.toString(),
        name: product.name,
        price: product.price,
        image_url: product.image_url || "/placeholder.svg",
        stock: product.stock_quantity,
      })
    }

    toast({
      title: "Added to cart",
      description: `${quantity} ${product.name} added to your cart`,
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
              {product.is_limited_edition && (
                <div className="absolute top-4 right-4 bg-[#ff6b9d] border-4 border-black px-4 py-2">
                  <span className="text-sm font-bold text-white">LIMITED EDITION</span>
                </div>
              )}
              {isLowStock && (
                <div className="absolute top-4 left-4 bg-[#ffb347] border-4 border-black px-4 py-2">
                  <span className="text-sm font-bold text-black">LOW STOCK</span>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute top-4 left-4 bg-[#dc3545] border-4 border-black px-4 py-2">
                  <span className="text-sm font-bold text-white">OUT OF STOCK</span>
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
                <span className="font-[family-name:var(--font-pixel)] text-4xl text-[#5b3a8f]">
                  ${product.price.toFixed(2)}
                </span>
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

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
              </Button>
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
          </div>
        </div>
      </main>
    </div>
  )
}

