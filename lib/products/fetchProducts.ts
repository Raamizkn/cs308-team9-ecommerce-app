export interface Product {
  pid: number
  id: string
  name: string
  description: string | null
  price: number
  image_url?: string
  rating: number
  review_count: number
  is_limited_edition: boolean
  stock_quantity: number
  stock: number
  discount_rate?: number | null
  discounted_price?: number | null
  has_discount?: boolean
  wishlist_count?: number
}

export interface FetchProductsParams {
  category?: string | null
  search?: string
  sort?: string
}

/**
 * Fetches products from the API with optional filters
 * @param params - Optional filters (category, search, sort)
 * @returns Array of products
 */
export async function fetchProducts(params?: FetchProductsParams): Promise<Product[]> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append("category", params.category)
    if (params?.search) searchParams.append("search", params.search)
    if (params?.sort) searchParams.append("sort", params.sort)

    const response = await fetch(`/api/products?${searchParams}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`)
    }

    const data = await response.json()

    // Debug logging for popularity sorting
    if (params?.sort === "popularity") {
      console.log("[Client] Sort parameter:", params?.sort)
      console.log("[Client] Received products with wishlist counts:", 
        (data.products || []).map((p: any) => ({ name: p.name, pid: p.pid, wishlist_count: p.wishlist_count }))
      )
      console.log("[Client] First product:", data.products?.[0] ? { name: data.products[0].name, wishlist_count: data.products[0].wishlist_count } : "none")
    }

    // Transform products to match component expectations
    const transformedProducts = (data.products || []).map((product: any) => ({
      ...product,
      id: String(product.pid),
      image_url: product.image_url || "/placeholder.svg",
      rating: product.rating || 0,
      review_count: product.review_count || 0,
      is_limited_edition: product.is_limited_edition || false,
      stock: product.stock_quantity || 0,
      discount_rate: product.discount_rate || null,
      discounted_price: product.discounted_price || null,
      has_discount: product.has_discount || false,
      wishlist_count: product.wishlist_count || 0, // Preserve wishlist_count for sorting
    }))

    // Debug: log transformed products order
    if (params?.sort === "popularity") {
      console.log("[Client] Transformed products order (first 3):", 
        transformedProducts.slice(0, 3).map((p: any) => ({ name: p.name, wishlist_count: p.wishlist_count }))
      )
    }

    return transformedProducts
  } catch (error) {
    console.error("[SWR] Error fetching products:", error)
    throw error
  }
}
