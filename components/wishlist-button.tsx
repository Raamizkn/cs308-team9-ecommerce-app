"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter, usePathname } from "next/navigation"

interface WishlistButtonProps {
  productId: string
  className?: string
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const checkWishlistStatus = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("[Group9] Error getting user:", userError)
        setIsAuthenticated(false)
        setIsInWishlist(false)
        setLoading(false)
        return
      }

      if (!user) {
        setIsAuthenticated(false)
        setIsInWishlist(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)

      const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
      if (isNaN(pidValue)) {
        console.warn("[Group9] Invalid productId for wishlist check:", productId)
        setIsInWishlist(false)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("wish_for")
        .select("uid, pid")
        .eq("uid", user.id)
        .eq("pid", pidValue)
        .maybeSingle()

      if (error) {
        console.error("[Group9] Error checking wishlist for product", pidValue, ":", error)
        setIsInWishlist(false)
      } else {
        const inWishlist = !!data
        console.log("[Group9] Wishlist check for product", pidValue, ":", inWishlist ? "IN WISHLIST" : "NOT IN WISHLIST")
        setIsInWishlist(inWishlist)
      }
    } catch (error) {
      console.error("[Group9] Error checking wishlist:", error)
      setIsInWishlist(false)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    // Initial check on mount
    checkWishlistStatus()
  }, [checkWishlistStatus])

  // Re-check wishlist status when navigating back to home/catalog pages
  useEffect(() => {
    if (pathname === "/" || pathname === "/catalog") {
      // Delay to ensure navigation and auth are complete
      const timer = setTimeout(() => {
        checkWishlistStatus()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, checkWishlistStatus])

  // Also check when window regains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        checkWishlistStatus()
      }, 100)
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [checkWishlistStatus])

  const handleToggleWishlist = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Login required",
          description: "Please log in to add items to your wishlist",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      if (isInWishlist) {
        // Remove from wishlist
        const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
        if (isNaN(pidValue)) {
          toast({
            title: "Error",
            description: "Invalid product ID",
            variant: "destructive",
          })
          return
        }

        const { error } = await supabase
          .from("wish_for")
          .delete()
          .eq("uid", user.id)
          .eq("pid", pidValue)

        if (error) throw error

        setIsInWishlist(false)
        toast({
          title: "Removed from wishlist",
          description: "Item removed from your wishlist",
        })
        // Refresh status after a short delay to ensure DB update is complete
        setTimeout(() => {
          checkWishlistStatus()
        }, 200)
      } else {
        // Ensure user exists in customers table (required by foreign key)
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("uid")
          .eq("uid", user.id)
          .maybeSingle()

        if (!existingCustomer) {
          // Get profile data to use for customer creation
          const { data: profile }: any = await supabase
            .from("profiles")
            .select("*")
            .eq("uid", user.id)
            .maybeSingle()

          // Create customer record with profile data or defaults
          const { error: customerError } = await supabase.from("customers").insert({
            uid: user.id,
            home_address: profile?.address || profile?.home_address || "Not provided",
            tax_id: `TAX-${user.id.slice(0, 8).toUpperCase()}`, // Generate a unique tax_id
          })

          if (customerError) {
            // If customer creation fails, try to continue anyway (might already exist)
            console.error("[Group9] Error creating customer:", customerError)
          }
        }

        // Check if item already exists in wishlist (prevent duplicate)
        const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
        if (isNaN(pidValue)) {
          toast({
            title: "Error",
            description: "Invalid product ID",
            variant: "destructive",
          })
          return
        }

        const { data: existingWish } = await supabase
          .from("wish_for")
          .select("uid, pid")
          .eq("uid", user.id)
          .eq("pid", pidValue)
          .maybeSingle()

        if (existingWish) {
          // Already in wishlist, just update state
          setIsInWishlist(true)
          return
        }

        // Add to wishlist
        const { error } = await supabase.from("wish_for").insert({
          uid: user.id,
          pid: pidValue,
        })

        if (error) {
          // If it's a duplicate key error, the item might have been added by another request
          if (error.code === "23505" || error.message?.includes("duplicate")) {
            setIsInWishlist(true)
            return
          }
          throw error
        }

        setIsInWishlist(true)
        toast({
          title: "Added to wishlist",
          description: "Item added to your wishlist",
        })
        // Refresh status after a short delay to ensure DB update is complete
        setTimeout(() => {
          checkWishlistStatus()
        }, 200)
      }
    } catch (error: any) {
      console.error("[Group9] Error toggling wishlist:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update wishlist",
        variant: "destructive",
      })
    }
  }

  return (
    <button
      onClick={handleToggleWishlist}
      className={`cursor-pointer transition-all hover:scale-110 ${className || ""}`}
      title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      disabled={loading}
    >
      <Heart
        className={`h-5 w-5 ${
          loading
            ? "text-[#6c757d] fill-none"
            : isInWishlist
            ? "fill-[#dc3545] text-[#dc3545]"
            : "fill-none text-[#1a1a3e] hover:text-[#dc3545]"
        } transition-colors`}
      />
    </button>
  )
}

