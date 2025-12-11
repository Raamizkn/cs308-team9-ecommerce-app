"use client"

import { useMemo } from "react"
import useSWR, { SWRConfiguration } from "swr"
import {
  fetchOrders,
  fetchOrderById,
  fetchRefundSummaries,
  type Order,
  type RefundSummary,
} from "@/lib/orders/fetchOrders"

interface UseOrdersReturn {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  mutate: any
}

interface UseOrderByIdReturn {
  order: Order | null
  isLoading: boolean
  isError: boolean
  mutate: any
}

interface UseRefundSummariesReturn {
  summaries: Record<string, RefundSummary>
  isLoading: boolean
  isError: boolean
  mutate: any
}

/**
 * Hook to fetch and cache all orders for the current user
 * Use this for the orders page that lists all user orders
 * @param userId - The authenticated user's ID (pass null if not authenticated)
 * @param options - SWR configuration options
 * @returns Orders data and utilities
 */
export function useOrders(userId: string | null, options?: SWRConfiguration): UseOrdersReturn {
  // Stable key: recompute only when userId changes
  const key = useMemo(() => (userId ? ["orders", userId] : null), [userId])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchOrders(userId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      ...options,
    }
  )

  return {
    orders: data || [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}

/**
 * Hook to fetch and cache a single order by ID
 * Use this for order detail pages
 * @param userId - The authenticated user's ID (pass null if not authenticated)
 * @param orderId - The order ID (pass null if no order is selected)
 * @param options - SWR configuration options
 * @returns Order data and utilities
 */
export function useOrderById(
  userId: string | null,
  orderId: string | null,
  options?: SWRConfiguration
): UseOrderByIdReturn {
  // Stable key: recompute only when userId or orderId changes
  const key = useMemo(() => (userId && orderId ? ["order", userId, orderId] : null), [
    userId,
    orderId,
  ])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchOrderById(userId!, orderId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      ...options,
    }
  )

  return {
    order: data || null,
    isLoading: !error && data === undefined,
    isError: !!error,
    mutate,
  }
}

/**
 * Hook to fetch and cache refund summaries for order items
 * Use this to show refund status in order items
 * @param itemIds - Array of order item IDs to fetch refund summaries for
 * @param options - SWR configuration options
 * @returns Refund summaries and utilities
 */
export function useRefundSummaries(
  itemIds: string[] | null,
  options?: SWRConfiguration
): UseRefundSummariesReturn {
  // Stable key: use sorted IDs to prevent cache misses with same data in different order
  const key = useMemo(
    () => (itemIds && itemIds.length > 0 ? ["refund-summaries", itemIds.sort().join(",")] : null),
    [itemIds]
  )

  const { data, error, mutate } = useSWR(
    key,
    () => fetchRefundSummaries(itemIds!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      ...options,
    }
  )

  return {
    summaries: data || {},
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}
