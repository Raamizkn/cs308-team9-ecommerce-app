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
    }))

    return transformedProducts
  } catch (error) {
    console.error("[SWR] Error fetching products:", error)
    throw error
  }
}
