import Image from "next/image"
import { Star } from "lucide-react"
import { AddToCartButton } from "./add-to-cart-button" // Import the client component

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
}: ProductCardProps) {
  return (
    <div className="bg-[#4ecdc4] border-4 border-black pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
      {/* Image Container */}
      <div className="relative aspect-square bg-[#2a9d8f] border-b-4 border-black overflow-hidden">
        <Image src={image_url || "/placeholder.svg"} alt={name} fill className="object-cover" />
        {is_limited_edition && (
          <div className="absolute top-2 right-2 bg-[#ff6b9d] border-2 border-black px-2 py-1">
            <span className="text-[10px] font-bold text-white">LIMITED</span>
          </div>
        )}
        {stock < 20 && stock > 0 && (
          <div className="absolute top-2 left-2 bg-[#ffb347] border-2 border-black px-2 py-1">
            <span className="text-[10px] font-bold text-black">LOW STOCK</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[#1a1a3e]">{name}</h3>

        <p className="text-sm text-[#0d0d1a] line-clamp-2 leading-relaxed">{description}</p>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(rating) ? "fill-[#ffd93d] text-[#ffd93d]" : "fill-none text-gray-400"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-[#0d0d1a] font-semibold">({review_count})</span>
        </div>

        {/* Price and Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">${price}</span>
          <AddToCartButton
            product={{
              id,
              product_id: id,
              name,
              price,
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
