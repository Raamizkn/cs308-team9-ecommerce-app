import Image from "next/image"
import Link from "next/link"
import { Star, Percent } from "lucide-react"
import { AddToCartButton } from "./add-to-cart-button" // Import the client component
import { WishlistButton } from "./wishlist-button"

interface ProductCardProps {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  rating: number
  review_count: number
  is_limited_edition: boolean
  stock: number
  discount_rate?: number | null
  discounted_price?: number | null
  has_discount?: boolean
  preloadedWishlistIds?: number[]
  onWishlistMutate?: () => void
}

export function ProductCard({
  id,
  name,
  description,
  price,
  image_url,
  rating,
  review_count,
  is_limited_edition,
  stock,
  discount_rate,
  discounted_price,
  has_discount,
  preloadedWishlistIds,
  onWishlistMutate,
}: ProductCardProps) {
  const displayPrice = has_discount && discounted_price ? discounted_price : price
  const discountPercentage = discount_rate ? Math.round(discount_rate * 100) : 0
  return (
    <div className="bg-[#4ecdc4] border-4 border-black pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
      {/* Image Container - Clickable */}
      <div className="relative aspect-square bg-[#2a9d8f] border-b-4 border-black overflow-hidden">
        <Link href={`/products/${id}`} className="block w-full h-full">
          <div className="relative w-full h-full">
            <Image src={image_url || "/placeholder.svg"} alt={name} fill className="object-contain" style={{ objectPosition: 'center' }} />
          </div>
        </Link>
        {/* Top-left badges - stacked vertically */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {has_discount && discount_rate && (
            <div className="bg-[#6bcf7f] border-2 border-black px-2 py-1 flex items-center gap-1">
              <Percent className="h-3 w-3 text-black" />
              <span className="text-[10px] font-bold text-black">{discountPercentage}% OFF</span>
            </div>
          )}
          {is_limited_edition && (
            <div className="bg-[#ff6b9d] border-2 border-black px-2 py-1">
              <span className="text-[10px] font-bold text-white">LIMITED</span>
            </div>
          )}
        </div>
        
        {/* Bottom-right badge - LOW STOCK */}
        {stock < 20 && stock > 0 && (
          <div className="absolute bottom-2 right-2 z-10">
            <div className="bg-[#ffb347] border-2 border-black px-2 py-1">
              <span className="text-[10px] font-bold text-black">LOW STOCK</span>
            </div>
          </div>
        )}
        {/* Wishlist button overlay on image - clickable and doesn't navigate */}
        <div className="absolute top-2 right-2 z-20" onClick={(e) => e.preventDefault()}>
          <WishlistButton productId={id} preloadedWishlistIds={preloadedWishlistIds} onMutate={onWishlistMutate} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <Link href={`/products/${id}`}>
          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[#1a1a3e] cursor-pointer hover:text-[#5b3a8f] transition-colors">
            {name}
          </h3>
        </Link>

        <p className="text-sm text-[#0d0d1a] line-clamp-2 leading-relaxed">{description}</p>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => {
              const starValue = i + 1
              const isHalfStar = rating >= starValue - 0.5 && rating < starValue
              const isFullStar = rating >= starValue
              
              return (
                <div key={i} className="relative h-4 w-4">
                  <Star
                    className={`h-4 w-4 absolute ${
                      isFullStar ? "fill-[#ffd93d] text-[#ffd93d]" : "fill-none text-gray-400"
                    }`}
                  />
                  {isHalfStar && (
                    <div className="absolute overflow-hidden w-2 h-4">
                      <Star className="h-4 w-4 fill-[#ffd93d] text-[#ffd93d]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <span className="text-xs text-[#0d0d1a] font-semibold">({review_count})</span>
        </div>

        {/* Price and Button */}
        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex flex-col">
            {has_discount && discounted_price ? (
              <>
                <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">
                  ${discounted_price.toFixed(2)}
                </span>
                <span className="text-xs text-[#6c757d] line-through">
                  ${price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">
                ${price.toFixed(2)}
              </span>
            )}
          </div>
          <AddToCartButton
            product={{
              id,
              product_id: id,
              name,
              price: displayPrice,
              image_url,
              stock,
            }}
            disabled={stock === 0}
          />
        </div>
      </div>
    </div>
  )
}
