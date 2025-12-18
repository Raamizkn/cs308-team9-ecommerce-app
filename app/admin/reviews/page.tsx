"use client"

import { useState, useEffect, useCallback } from "react"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Star, MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Review {
  id: string
  review_id: string
  productId: number
  productName: string
  customerId: string
  customerName: string
  rating: number
  comment: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  approvedAt?: string
  approvedBy?: string
}

export default function ReviewApprovalPage() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      // Add status filter if not "all"
      const url = filter === "all" ? "/api/reviews" : `/api/reviews?status=${filter}`
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch reviews")
      }
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error("[Group9] Error fetching reviews:", error)
      toast({
        title: "Error loading reviews",
        description: error instanceof Error ? error.message : "Failed to fetch reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve review")
      }

      const data = await response.json()

      // Update local state
      setReviews(reviews.map((r) =>
        r.id === reviewId || r.review_id === reviewId
          ? { ...r, status: "approved" as const, approvedAt: data.review.approvedAt }
          : r
      ))

      toast({
        title: "Review Approved",
        description: "The review is now visible to customers",
      })
    } catch (error) {
      console.error("[Group9] Error approving review:", error)
      toast({
        title: "Error approving review",
        description: error instanceof Error ? error.message : "Failed to approve review",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject review")
      }

      // Update local state
      setReviews(reviews.map((r) =>
        r.id === reviewId || r.review_id === reviewId
          ? { ...r, status: "rejected" as const }
          : r
      ))

      toast({
        title: "Review Rejected",
        description: "The review will not be visible to customers",
        variant: "destructive",
      })
    } catch (error) {
      console.error("[Group9] Error rejecting review:", error)
      toast({
        title: "Error rejecting review",
        description: error instanceof Error ? error.message : "Failed to reject review",
        variant: "destructive",
      })
    }
  }

  // Reviews are already filtered by the API based on the filter state
  const filteredReviews = reviews

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-[#6bcf7f] text-[#1a1a3e]"
      case "rejected":
        return "bg-[#dc3545] text-white"
      default:
        return "bg-[#ffb347] text-[#1a1a3e]"
    }
  }

  const getStats = () => {
    return {
      total: reviews.length,
      pending: reviews.filter(r => r.status === "pending").length,
      approved: reviews.filter(r => r.status === "approved").length,
      rejected: reviews.filter(r => r.status === "rejected").length,
    }
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admin">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO ADMIN
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
            REVIEW APPROVAL
          </h1>
          <p className="text-[#6c757d] font-semibold">
            Approve or reject customer reviews (Product Manager Only)
          </p>
        </div>


        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#6c757d] mb-1">TOTAL REVIEWS</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.total}
            </div>
          </div>
          <div className="bg-[#ffb347] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">PENDING</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.pending}
            </div>
          </div>
          <div className="bg-[#6bcf7f] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-[#1a1a3e] mb-1">APPROVED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
              {stats.approved}
            </div>
          </div>
          <div className="bg-[#dc3545] border-4 border-black p-4 pixel-shadow-sm">
            <div className="text-sm font-bold text-white mb-1">REJECTED</div>
            <div className="font-[family-name:var(--font-pixel)] text-3xl text-white">
              {stats.rejected}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white border-4 border-black p-4 pixel-shadow-sm mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-[#1a1a3e]">FILTER:</span>
            <Button
              onClick={() => setFilter("all")}
              className={`border-2 border-black font-bold ${
                filter === "all" ? "bg-[#5b3a8f] text-white" : "bg-white text-black hover:bg-[#e9ecef]"
              }`}
            >
              ALL
            </Button>
            <Button
              onClick={() => setFilter("pending")}
              className={`border-2 border-black font-bold ${
                filter === "pending" ? "bg-[#ffb347] text-black" : "bg-white text-black hover:bg-[#e9ecef]"
              }`}
            >
              PENDING
            </Button>
            <Button
              onClick={() => setFilter("approved")}
              className={`border-2 border-black font-bold ${
                filter === "approved" ? "bg-[#6bcf7f] text-black" : "bg-white text-black hover:bg-[#e9ecef]"
              }`}
            >
              APPROVED
            </Button>
            <Button
              onClick={() => setFilter("rejected")}
              className={`border-2 border-black font-bold ${
                filter === "rejected" ? "bg-[#dc3545] text-white" : "bg-white text-black hover:bg-[#e9ecef]"
              }`}
            >
              REJECTED
            </Button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
              <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin mb-4" />
              <p className="text-[#6c757d] font-semibold">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
              <MessageSquare className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
              <p className="text-2xl font-bold text-[#6c757d] mb-2">No reviews found</p>
              <p className="text-[#6c757d]">
                {filter === "pending" 
                  ? "No pending reviews to approve" 
                  : `No ${filter} reviews`}
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="bg-white border-4 border-black pixel-shadow-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          href={`/products/${review.productId}`}
                          className="font-bold text-xl text-[#1a1a3e] hover:text-[#5b3a8f] transition-colors"
                        >
                          {review.productName}
                        </Link>
                        <span className={`px-3 py-1 text-xs font-bold border-2 border-black ${getStatusColor(review.status)}`}>
                          {review.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#6c757d]">
                        <span className="font-bold">{review.customerName}</span>
                        <span>•</span>
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating 
                            ? "fill-[#ffd93d] text-[#ffd93d]" 
                            : "fill-none text-gray-400"
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-bold text-[#1a1a3e]">
                      {review.rating}/5
                    </span>
                  </div>

                  {/* Comment */}
                  <div className="p-4 bg-[#f8f9fa] border-2 border-black mb-4">
                    <p className="text-[#1a1a3e] leading-relaxed">{review.comment}</p>
                  </div>

                  {/* Actions */}
                  {review.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => handleApprove(review.review_id || review.id)}
                        className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-4 border-black font-bold"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        APPROVE
                      </Button>
                      <Button
                        onClick={() => handleReject(review.review_id || review.id)}
                        className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black font-bold"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        REJECT
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

