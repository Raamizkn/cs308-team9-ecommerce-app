"use client"

import { useMemo } from "react"
import useSWR, { SWRConfiguration } from "swr"
import { fetchProducts, type Product, type FetchProductsParams } from "@/lib/products/fetchProducts"

interface UseProductsReturn {
  products: Product[]
  isLoading: boolean
  isError: boolean
  mutate: any
}

/**
 * Hook to fetch and cache products with optional filters
 * Use this in Home page and Catalog page
 * @param params - Filter parameters (category, search, sort)
 * @param options - SWR configuration options
 * @returns Products data and utilities
 */
export function useProducts(
  params?: FetchProductsParams,
  options?: SWRConfiguration
): UseProductsReturn {
  // Stable key: create a consistent key based on filter parameters
  const key = useMemo(() => {
    const filterArray = [
      "products",
      params?.category || null,
      params?.search || null,
      params?.sort || null,
    ]
    return filterArray
  }, [params?.category, params?.search, params?.sort])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchProducts(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5-second dedup for product listings
      ...options,
    }
  )

  return {
    products: data || [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}
