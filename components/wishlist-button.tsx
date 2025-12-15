"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useWishlistStatus } from "@/hooks/useWishlist"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface WishlistButtonProps {
  productId: string
  className?: string
  preloadedWishlistIds?: number[]
  onMutate?: () => void
}

export function WishlistButton({ productId, className, preloadedWishlistIds, onMutate }: WishlistButtonProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [localWishlistIds, setLocalWishlistIds] = useState<number[]>(preloadedWishlistIds || [])
  const { toast } = useToast()
  const router = useRouter()

  // Parse product ID to number
  const pidValue = productId ? parseInt(productId, 10) : null

  // Use preloaded wishlist IDs if available, otherwise fall back to SWR hook
  const isInWishlist = localWishlistIds.includes(pidValue || 0)
  const shouldUseSWR = !preloadedWishlistIds

  // Use SWR hook for wishlist status only if preloaded data is not available
  const { isInWishlist: swrIsInWishlist, isLoading: isSWRLoading, mutate: mutateWishlist } = useWishlistStatus(
    shouldUseSWR ? userId : null,
    shouldUseSWR ? pidValue : null
  )

  // Use preloaded status if available, otherwise use SWR result
  const actualIsInWishlist = preloadedWishlistIds ? isInWishlist : swrIsInWishlist
  const isLoading = isLoadingUser || (shouldUseSWR ? isSWRLoading : false)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUserId(user?.id || null)
    } catch (error) {
      console.error("[Group9] Error checking auth:", error)
      setUserId(null)
    } finally {
      setIsLoadingUser(false)
    }
  }

  const handleToggleWishlist = async () => {
    try {
      const supabase = getSupabaseBrowserClient()

      if (!userId) {
        toast({
          title: "Login required",
          description: "Please log in to add items to your wishlist",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      if (!pidValue || isNaN(pidValue)) {
        toast({
          title: "Error",
          description: "Invalid product ID",
          variant: "destructive",
        })
        return
      }

      if (actualIsInWishlist) {
        // Remove from wishlist
        const { error } = await supabase
          .from("wish_for")
          .delete()
          .eq("uid", userId)
          .eq("pid", pidValue)

        if (error) throw error

        // Update local state immediately for instant UI update
        setLocalWishlistIds(prev => prev.filter(id => id !== pidValue))

        toast({
          title: "Removed from wishlist",
          description: "Item removed from your wishlist",
        })
        // Revalidate SWR cache and parent
        mutateWishlist()
        onMutate?.()
      } else {
        // Ensure user exists in customers table (required by foreign key)
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("uid")
          .eq("uid", userId)
          .maybeSingle()

        if (!existingCustomer) {
          // Get profile data to use for customer creation
          const { data: profile }: any = await supabase
            .from("profiles")
            .select("*")
            .eq("uid", userId)
            .maybeSingle()

          // Create customer record with profile data or defaults
          const { error: customerError } = await supabase.from("customers").insert({
            uid: userId,
            home_address: profile?.address || profile?.home_address || "Not provided",
            tax_id: `TAX-${userId.slice(0, 8).toUpperCase()}`, // Generate a unique tax_id
          })

          if (customerError) {
            // If customer creation fails, try to continue anyway (might already exist)
            console.error("[Group9] Error creating customer:", customerError)
          }
        }

        // Check if item already exists in wishlist (prevent duplicate)
        const { data: existingWish } = await supabase
          .from("wish_for")
          .select("uid, pid")
          .eq("uid", userId)
          .eq("pid", pidValue)
          .maybeSingle()

        if (existingWish) {
          // Already in wishlist, just update SWR
          mutateWishlist()
          onMutate?.()
          return
        }

        // Add to wishlist
        const { error } = await supabase.from("wish_for").insert({
          uid: userId,
          pid: pidValue,
        })

        if (error) {
          // If it's a duplicate key error, the item might have been added by another request
          if (error.code === "23505" || error.message?.includes("duplicate")) {
            // Update local state for duplicate too
            setLocalWishlistIds(prev => [...new Set([...prev, pidValue])])
            mutateWishlist()
            onMutate?.()
            return
          }
          throw error
        }

        // Update local state immediately for instant UI update
        setLocalWishlistIds(prev => [...new Set([...prev, pidValue])])

        toast({
          title: "Added to wishlist",
          description: "Item added to your wishlist",
        })
        // Revalidate SWR cache and parent
        mutateWishlist()
        onMutate?.()
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
      title={actualIsInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-label={actualIsInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      disabled={isLoading || !userId}
    >
      <Heart
        className={`h-5 w-5 ${
          isLoading && !userId
            ? "text-[#6c757d] fill-none"
            : actualIsInWishlist
            ? "fill-[#dc3545] text-[#dc3545]"
            : "fill-none text-[#1a1a3e] hover:text-[#dc3545]"
        } transition-colors`}
      />
    </button>
  )
}

