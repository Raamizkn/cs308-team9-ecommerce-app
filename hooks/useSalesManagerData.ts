"use client"

import useSWR, { SWRConfiguration } from "swr"
import {
  fetchSalesManagerOrders,
  fetchRevenueStats,
  fetchTopProducts,
  type SalesManagerOrder,
  type RevenueStats,
  type TopProduct,
} from "@/lib/salesManager/fetchSalesManagerData"

interface UseSalesManagerOrdersReturn {
  orders: SalesManagerOrder[]
  isLoading: boolean
  isError: boolean
  mutate: any
}

interface UseRevenueStatsReturn {
  stats: RevenueStats | null
  isLoading: boolean
  isError: boolean
  mutate: any
}

interface UseTopProductsReturn {
  products: TopProduct[]
  isLoading: boolean
  isError: boolean
  mutate: any
}

/**
 * Hook to fetch and cache all orders for sales manager
 * Use this for the sales manager orders overview page
 * @param isSalesManager - Whether the user is a sales manager (check before using)
 * @param options - SWR configuration options
 * @returns Orders data and utilities
 */
export function useSalesManagerOrders(
  isSalesManager: boolean,
  options?: SWRConfiguration
): UseSalesManagerOrdersReturn {
  const { data, error, mutate } = useSWR(
    isSalesManager ? "sales-manager-orders" : null,
    fetchSalesManagerOrders,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Longer dedup interval for admin data
      ...options,
    }
  )

  return {
    orders: data || [],
    isLoading: isSalesManager && !error && !data,
    isError: !!error,
    mutate,
  }
}

/**
 * Hook to fetch and cache revenue statistics for sales manager
 * Use this for the revenue and profit dashboard
 * @param isSalesManager - Whether the user is a sales manager (check before using)
 * @param options - SWR configuration options
 * @returns Revenue statistics and utilities
 */
export function useRevenueStats(
  isSalesManager: boolean,
  options?: SWRConfiguration
): UseRevenueStatsReturn {
  const { data, error, mutate } = useSWR(
    isSalesManager ? "revenue-stats" : null,
    fetchRevenueStats,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      ...options,
    }
  )

  return {
    stats: data || null,
    isLoading: isSalesManager && !error && !data,
    isError: !!error,
    mutate,
  }
}

/**
 * Hook to fetch and cache top products for sales manager
 * Use this for dashboard analytics
 * @param isSalesManager - Whether the user is a sales manager (check before using)
 * @param limit - Number of top products to return (default: 5)
 * @param options - SWR configuration options
 * @returns Top products and utilities
 */
export function useTopProducts(
  isSalesManager: boolean,
  limit: number = 5,
  options?: SWRConfiguration
): UseTopProductsReturn {
  const { data, error, mutate } = useSWR(
    isSalesManager ? ["top-products", limit] : null,
    () => fetchTopProducts(limit),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      ...options,
    }
  )

  return {
    products: data || [],
    isLoading: isSalesManager && !error && !data,
    isError: !!error,
    mutate,
  }
}
