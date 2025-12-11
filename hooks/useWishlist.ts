"use client"

import { useMemo } from "react"
import useSWR, { SWRConfiguration } from "swr"
import { fetchWishlist, fetchWishlistStatus } from "@/lib/wishlist/fetchWishlist"

interface UseWishlistOptions extends SWRConfiguration {
  productId?: number
}

interface UseWishlistReturn {
  wishlistProductIds: number[]
  isLoading: boolean
  isError: boolean
  mutate: any
}

interface UseWishlistStatusReturn {
  isInWishlist: boolean
  isLoading: boolean
  isError: boolean
  mutate: any
}

/**
 * Hook to fetch and cache the user's entire wishlist
 * Use this for pages that display the full wishlist
 * @param userId - The authenticated user's ID (pass null if not authenticated)
 * @param options - SWR configuration options
 * @returns Wishlist data and utilities
 */
export function useWishlist(
  userId: string | null,
  options?: UseWishlistOptions
): UseWishlistReturn {
  // Stable key: recompute only when userId changes
  const key = useMemo(() => (userId ? ["wishlist", userId] : null), [userId])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchWishlist(userId!),
    {
      revalidateOnFocus: false,
      ...options,
    }
  )

  return {
    wishlistProductIds: data || [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}

/**
 * Hook to check if a specific product is in the user's wishlist
 * Use this for individual product cards or buttons
 * @param userId - The authenticated user's ID (pass null if not authenticated)
 * @param productId - The product ID to check
 * @param options - SWR configuration options
 * @returns Wishlist status for this product and utilities
 */
export function useWishlistStatus(
  userId: string | null,
  productId: number | null,
  options?: SWRConfiguration
): UseWishlistStatusReturn {
  // Stable key: recompute only when userId or productId changes
  const key = useMemo(() => (userId && productId ? ["wishlist-status", userId, productId] : null), [userId, productId])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchWishlistStatus(userId!, productId!),
    {
      revalidateOnFocus: false,
      ...options,
    }
  )

  return {
    isInWishlist: data || false,
    isLoading: !error && data === undefined,
    isError: !!error,
    mutate,
  }
}
