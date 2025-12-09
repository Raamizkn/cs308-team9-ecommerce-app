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
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetchProduct()
    fetchReviews()
    checkReviewEligibility()
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

      // Also check if user already reviewed this product
      if (hasDeliveredProduct) {
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("review_id")
          .eq("product_id", parseInt(params.id as string))
          .eq("customer_id", user.id)
          .maybeSingle()

        setCanReview(hasDeliveredProduct && !existingReview)
      } else {
        setCanReview(false)
      }
    } catch (error) {
      console.error("[Group9] Error checking review eligibility:", error)
      setCanReview(false)
    } finally {
      setCheckingReviewEligibility(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      toast({
        title: "Rating required",
        description: "Please select a rating between 1 and 5 stars",
        variant: "destructive",
      })
      return
    }

    if (!reviewComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please write a comment for your review",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingReview(true)
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(params.id as string),
          rating: selectedRating,
          comment: reviewComment.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review")
      }

      toast({
        title: "Review submitted!",
        description: "Your review has been submitted and will be visible after product manager approval.",
      })

      // Reset form
      setSelectedRating(0)
      setReviewComment("")
      setShowReviewDialog(false)

      // Refresh reviews and eligibility
      await fetchReviews()
      await checkReviewEligibility()
    } catch (error: any) {
      console.error("[Group9] Error submitting review:", error)
      toast({
        title: "Failed to submit review",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingReview(false)
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

  // Calculate average rating from ALL reviews (ratings are visible immediately)
  // But only count reviews with visible comments for review count
  const allReviewsWithRatings = reviews.filter((r) => r.rating) // All reviews have ratings
  const reviewsWithVisibleComments = reviews.filter((r) => 
    r.status === "approved" || r.is_approved === true || r.commentVisible === true
  )
  const averageRating = allReviewsWithRatings.length > 0
    ? allReviewsWithRatings.reduce((sum, r) => sum + r.rating, 0) / allReviewsWithRatings.length
    : product.rating || 0
  const reviewCount = reviewsWithVisibleComments.length || product.review_count || 0
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
              {checkingReviewEligibility ? (
                <div className="mb-6 p-4 bg-[#e9ecef] border-2 border-black text-center">
                  <div className="inline-block w-6 h-6 border-2 border-black border-t-[#ffb347] rounded-full animate-spin" />
                </div>
              ) : canReview ? (
                <div className="mb-6 p-4 bg-[#e9ecef] border-2 border-black">
                  <p className="text-sm text-[#6c757d] mb-3">
                    <strong>Note:</strong> You can only review products you've purchased and received.
                  </p>
                  <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold w-full">
                        <Star className="h-4 w-4 mr-2" />
                        WRITE A REVIEW
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-4 border-black max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                          Write a Review
                        </DialogTitle>
                        <DialogDescription className="text-[#6c757d]">
                          Share your experience with {product.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {/* Rating Selection */}
                        <div>
                          <label className="font-bold text-[#1a1a3e] mb-3 block">
                            Rating <span className="text-[#dc3545]">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setSelectedRating(star)}
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

                        {/* Comment Textarea */}
                        <div>
                          <label htmlFor="review-comment" className="font-bold text-[#1a1a3e] mb-2 block">
                            Your Review <span className="text-[#dc3545]">*</span>
                          </label>
                          <Textarea
                            id="review-comment"
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

                        {/* Info Note */}
                        <div className="bg-[#e9ecef] border-2 border-black p-3">
                          <p className="text-sm text-[#6c757d]">
                            <strong>Note:</strong> Your rating will be visible immediately, but your comment will need product manager approval before it appears.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewDialog(false)
                            setSelectedRating(0)
                            setReviewComment("")
                          }}
                          className="border-4 border-black"
                          disabled={submittingReview}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submittingReview || !selectedRating || !reviewComment.trim()}
                          className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
                        >
                          {submittingReview ? (
                            <>
                              <div className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Review"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                ) : allReviewsWithRatings.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-[#6c757d]">
                    <MessageSquare className="h-12 w-12 text-[#6c757d] mx-auto mb-3" />
                    <p className="text-[#6c757d] font-semibold">
                      No reviews yet. Be the first to review this product!
                    </p>
                  </div>
                ) : (
                  allReviewsWithRatings.map((review) => {
                    const commentVisible = review.status === "approved" || review.is_approved === true || review.commentVisible === true
                    return (
                      <div key={review.review_id} className="p-4 border-2 border-black bg-[#f8f9fa]">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-[#ffd93d] text-[#ffd93d]"
                                        : "fill-none text-gray-400"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-[#1a1a3e]">
                                {review.profiles?.name || "Anonymous"}
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
                        {commentVisible && review.comment ? (
                          <p className="text-[#1a1a3e]">{review.comment}</p>
                        ) : (
                          <div className="bg-[#fff3cd] border-2 border-[#ffc107] p-3 rounded">
                            <p className="text-sm text-[#856404] font-semibold">
                              ⏳ Comment pending approval by product manager
                            </p>
                          </div>
                        )}
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

