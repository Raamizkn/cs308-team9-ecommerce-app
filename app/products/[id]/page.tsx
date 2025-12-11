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
import { useWishlist } from "@/hooks/useWishlist"
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
  id?: string
  review_id: string
  productId?: number
  productName?: string
  customerId?: string
  customerName?: string
  rating: number
  comment: string
  status?: "pending" | "approved" | "rejected"
  created_at: string
  createdAt?: string
  is_approved?: boolean
  profiles?: { name: string }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  const [hasCommented, setHasCommented] = useState(false)
  const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Get wishlist mutate function for cache updates
  const { mutate: mutateWishlist } = useWishlist(userId)

  useEffect(() => {
    fetchProduct()
    fetchReviews()
    checkReviewEligibility()
    checkUserAuth()
  }, [params.id])

  const checkUserAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    } catch (error) {
      console.error("[Group9] Error checking auth:", error)
      setUserId(null)
    }
  }

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

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true)
      const response = await fetch(`/api/reviews?product_id=${params.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch reviews")
      }
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error("[Group9] Error fetching reviews:", error)
      // Don't show error toast for reviews, just log it
    } finally {
      setLoadingReviews(false)
    }
  }

  const checkReviewEligibility = async () => {
    try {
      setCheckingReviewEligibility(true)
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCanReview(false)
        setCheckingReviewEligibility(false)
        return
      }

      // Check if user has delivered orders containing this product
      const { data: deliveredOrders, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_items!inner (
            product_id
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "delivered")

      if (error) {
        console.error("[Group9] Error checking review eligibility:", error)
        setCanReview(false)
        return
      }

      // Check if any delivered order contains this product
      const hasDeliveredProduct = deliveredOrders?.some((order: any) =>
        order.order_items?.some((item: any) => item.product_id === parseInt(params.id as string))
      )

      // Check separately if user has rated and if user has commented
      if (hasDeliveredProduct) {
        const { data: existingReviews } = await supabase
          .from("reviews")
          .select("review_id, rating, comment")
          .eq("product_id", parseInt(params.id as string))
          .eq("customer_id", user.id)

        // Check for rating row (rating IS NOT NULL, comment IS NULL)
        const hasRatingRow = existingReviews?.some(
          (r: any) => r.rating !== null && r.comment === null
        )
        
        // Check for comment row (comment IS NOT NULL, rating IS NULL)
        const hasCommentRow = existingReviews?.some(
          (r: any) => r.comment !== null && r.rating === null
        )

        setHasRated(!!hasRatingRow)
        setHasCommented(!!hasCommentRow)
        setCanReview(hasDeliveredProduct) // Can review if they have delivered product
      } else {
        setCanReview(false)
        setHasRated(false)
        setHasCommented(false)
      }
    } catch (error) {
      console.error("[Group9] Error checking review eligibility:", error)
      setCanReview(false)
    } finally {
      setCheckingReviewEligibility(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      toast({
        title: "Rating required",
        description: "Please select a rating between 1 and 5 stars",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingRating(true)
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(params.id as string),
          rating: selectedRating,
          comment: null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit rating")
      }

      toast({
        title: "Rating submitted!",
        description: "Your rating has been submitted and is visible immediately.",
      })

      // Reset form
      setSelectedRating(0)
      setShowRatingDialog(false)

      // Refresh reviews and eligibility
      await fetchReviews()
      await checkReviewEligibility()
    } catch (error: any) {
      console.error("[Group9] Error submitting rating:", error)
      toast({
        title: "Failed to submit rating",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!reviewComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter a comment",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingComment(true)
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(params.id as string),
          rating: null,
          comment: reviewComment.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit comment")
      }

      toast({
        title: "Comment submitted!",
        description: "Your comment will be visible after product manager approval.",
      })

      // Reset form
      setReviewComment("")
      setShowCommentDialog(false)

      // Refresh reviews and eligibility
      await fetchReviews()
      await checkReviewEligibility()
    } catch (error: any) {
      console.error("[Group9] Error submitting comment:", error)
      toast({
        title: "Failed to submit comment",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
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

  // Separate rating rows (rating IS NOT NULL, comment IS NULL) and comment rows (comment IS NOT NULL, rating IS NULL)
  const ratingRows = reviews.filter((r) => r.rating !== null && r.rating !== undefined && r.rating > 0 && (!r.comment || r.comment.trim() === ""))
  const commentRows = reviews.filter((r) => r.comment && r.comment.trim() !== "" && (!r.rating || r.rating === 0))
  
  // For display, combine rating rows with their matching comment rows (by customer_id)
  // If a customer has both a rating row and a comment row, show them together
  const reviewsToDisplay: Review[] = []
  
  // Process rating rows and match with comment rows
  ratingRows.forEach((ratingRow) => {
    // Find matching comment row for same customer
    const matchingCommentIndex = commentRows.findIndex(
      (c) => c.customerId === ratingRow.customerId
    )
    
    if (matchingCommentIndex !== -1) {
      // Customer has both rating and comment - combine them
      const matchingComment = commentRows[matchingCommentIndex]
      reviewsToDisplay.push({
        ...ratingRow,
        comment: matchingComment.comment,
        commentVisible: matchingComment.status === "approved" || matchingComment.is_approved === true || matchingComment.commentVisible === true,
      })
      // Remove comment row from array so we don't add it again
      commentRows.splice(matchingCommentIndex, 1)
    } else {
      // Rating only
      reviewsToDisplay.push({
        ...ratingRow,
        comment: null,
        commentVisible: false,
      })
    }
  })
  
  // Add remaining comment-only rows (comments without ratings)
  commentRows.forEach((commentRow) => {
    reviewsToDisplay.push({
      ...commentRow,
      rating: 0,
      commentVisible: commentRow.status === "approved" || commentRow.is_approved === true || commentRow.commentVisible === true,
    })
  })
  
  // Calculate average rating from rating rows only
  const averageRating = ratingRows.length > 0
    ? ratingRows.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingRows.length
    : product.rating || 0
  const reviewCount = reviewsToDisplay.length || product.review_count || 0
  const rating = averageRating
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
                className="object-contain"
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
                  {[...Array(5)].map((_, i) => {
                    const starValue = i + 1
                    const isHalfStar = rating >= starValue - 0.5 && rating < starValue
                    const isFullStar = rating >= starValue
                    
                    return (
                      <div key={i} className="relative h-5 w-5">
                        <Star
                          className={`h-5 w-5 absolute ${
                            isFullStar ? "fill-[#ffd93d] text-[#ffd93d]" : "fill-none text-gray-400"
                          }`}
                        />
                        {isHalfStar && (
                          <div className="absolute overflow-hidden w-2.5 h-5">
                            <Star className="h-5 w-5 fill-[#ffd93d] text-[#ffd93d]" />
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                <WishlistButton productId={product.pid.toString()} className="flex-shrink-0" onMutate={mutateWishlist} />
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

              {/* Rating and Comment Sections - Shows only for delivered orders */}
              {checkingReviewEligibility ? (
                <div className="mb-6 p-4 bg-[#e9ecef] border-2 border-black text-center">
                  <div className="inline-block w-6 h-6 border-2 border-black border-t-[#ffb347] rounded-full animate-spin" />
                </div>
              ) : canReview ? (
                <div className="mb-6 space-y-4">
                  <p className="text-sm text-[#6c757d] mb-3">
                    <strong>Note:</strong> You can only review products you've purchased and received.
                  </p>
                  
                  {/* Rating Section */}
                  <div className="p-4 bg-[#e9ecef] border-2 border-black">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#1a1a3e]">Rate this Product</h4>
                      {hasRated && (
                        <span className="text-sm text-[#6bcf7f] font-semibold">✓ You've already rated this product</span>
                      )}
                    </div>
                    <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold w-full"
                          disabled={hasRated}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {hasRated ? "UPDATE RATING" : "RATE THIS PRODUCT"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-4 border-black max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                            {hasRated ? "Update Your Rating" : "Rate this Product"}
                          </DialogTitle>
                          <DialogDescription className="text-[#6c757d]">
                            Your rating will be visible immediately.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div>
                            <label className="font-bold text-[#1a1a3e] mb-3 block">
                              Select Your Rating
                            </label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setSelectedRating(selectedRating === star ? 0 : star)}
                                  className="focus:outline-none transition-transform hover:scale-110"
                                >
                                  <Star
                                    className={`h-10 w-10 ${
                                      star <= selectedRating
                                        ? "fill-[#ffd93d] text-[#ffd93d]"
                                        : "fill-none text-gray-300"
                                    }`}
                                  />
                                </button>
                              ))}
                              {selectedRating > 0 && (
                                <span className="ml-2 font-bold text-[#1a1a3e]">
                                  {selectedRating} {selectedRating === 1 ? "star" : "stars"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRatingDialog(false)
                              setSelectedRating(0)
                            }}
                            className="border-4 border-black"
                            disabled={submittingRating}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitRating}
                            disabled={submittingRating || !selectedRating}
                            className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                          >
                            {submittingRating ? (
                              <>
                                <div className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Rating"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Comment Section */}
                  <div className="p-4 bg-[#e9ecef] border-2 border-black">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#1a1a3e]">Post a Comment</h4>
                      {hasCommented && (
                        <span className="text-sm text-[#6bcf7f] font-semibold">✓ You've already commented on this product</span>
                      )}
                    </div>
                    <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold w-full"
                          disabled={hasCommented}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {hasCommented ? "UPDATE COMMENT" : "POST COMMENT"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-4 border-black max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                            {hasCommented ? "Update Your Comment" : "Post a Comment"}
                          </DialogTitle>
                          <DialogDescription className="text-[#6c757d]">
                            Your comment will be visible after product manager approval.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div>
                            <label htmlFor="comment-text" className="font-bold text-[#1a1a3e] mb-2 block">
                              Your Comment
                            </label>
                            <Textarea
                              id="comment-text"
                              placeholder="Share your thoughts about this product..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="border-4 border-black min-h-[120px] resize-none"
                              maxLength={1000}
                            />
                            <p className="text-xs text-[#6c757d] mt-1">
                              {reviewComment.length}/1000 characters
                            </p>
                          </div>
                          <div className="bg-[#e9ecef] border-2 border-black p-3">
                            <p className="text-sm text-[#6c757d]">
                              <strong>Note:</strong> Comments require product manager approval before being displayed.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCommentDialog(false)
                              setReviewComment("")
                            }}
                            className="border-4 border-black"
                            disabled={submittingComment}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitComment}
                            disabled={submittingComment || !reviewComment.trim()}
                            className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                          >
                            {submittingComment ? (
                              <>
                                <div className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                                Submitting...
                              </>
                            ) : (
                              "Post Comment"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-[#e9ecef] border-2 border-black">
                  <p className="text-sm text-[#6c757d]">
                    <strong>Note:</strong> You can only review products you've purchased and received. Make sure your order is delivered before leaving a review.
                  </p>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {loadingReviews ? (
                  <div className="text-center p-8">
                    <div className="inline-block w-8 h-8 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
                  </div>
                ) : reviewsToDisplay.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-[#6c757d]">
                    <MessageSquare className="h-12 w-12 text-[#6c757d] mx-auto mb-3" />
                    <p className="text-[#6c757d] font-semibold">
                      No reviews yet. Be the first to review this product!
                    </p>
                  </div>
                ) : (
                  reviewsToDisplay.map((review) => {
                    return (
                      <div key={review.review_id} className="p-4 border-2 border-black bg-[#f8f9fa]">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {review.rating && review.rating > 0 ? (
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => {
                                    const starValue = i + 1
                                    const isHalfStar = review.rating >= starValue - 0.5 && review.rating < starValue
                                    const isFullStar = review.rating >= starValue
                                    
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
                              ) : null}
                              <span className="font-bold text-[#1a1a3e]">
                                {review.profiles?.name || review.customerName || "Anonymous"}
                              </span>
                            </div>
                            <p className="text-xs text-[#6c757d]">Verified Purchase</p>
                          </div>
                          <span className="text-xs text-[#6c757d]">
                            {new Date(review.created_at || review.createdAt || "").toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {review.comment ? (
                          review.commentVisible ? (
                            <p className="text-[#1a1a3e]">{review.comment}</p>
                          ) : (
                            <div className="bg-[#fff3cd] border-2 border-[#ffc107] p-3 rounded">
                              <p className="text-sm text-[#856404] font-semibold">
                                ⏳ Comment pending approval by product manager
                              </p>
                            </div>
                          )
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

