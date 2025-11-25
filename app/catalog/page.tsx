"use client"

import { useEffect, useState } from "react"
import { PixelHeader } from "@/components/pixel-header"
import { CategoryFilter } from "@/components/category-filter"
import { ProductCard } from "@/components/product-card"
import { SearchBar } from "@/components/search-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Product {
  pid: number
  id: string // Added during transformation
  name: string
  description: string
  price: number
  image_url: string
  rating: number
  review_count: number
  is_limited_edition: boolean
  stock_quantity: number
  stock: number // Added during transformation
  discount_rate?: number | null
  discounted_price?: number | null
  has_discount?: boolean
}

interface Category {
  cid: number
  name: string
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, sortBy])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append("category", selectedCategory)
      if (searchQuery) params.append("search", searchQuery)
      if (sortBy) params.append("sort", sortBy)

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      
      // Transform products to match component expectations
      const transformedProducts = (data.products || []).map((product: any) => ({
        ...product,
        id: String(product.pid), // Convert pid to string for key prop
        image_url: product.image_url || "/placeholder.svg",
        rating: product.rating || 0,
        review_count: product.review_count || 0,
        is_limited_edition: product.is_limited_edition || false,
        stock: product.stock_quantity || 0,
        discount_rate: product.discount_rate || null,
        discounted_price: product.discounted_price || null,
        has_discount: product.has_discount || false,
      }))
      
      setProducts(transformedProducts)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSortLabel = (value: string) => {
    switch (value) {
      case "price_asc":
        return "PRICE: LOW TO HIGH"
      case "price_desc":
        return "PRICE: HIGH TO LOW"
      case "popularity":
        return "MOST POPULAR"
      case "rating":
        return "HIGHEST RATED"
      default:
        return "NEWEST FIRST"
    }
  }

  return (
    <div className="min-h-screen bg-[#e8f4f8]">
      <PixelHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-5xl text-[#2c3e50] mb-4 pixel-shadow">
            PIXEL CATALOG
          </h1>
          <p className="text-lg text-[#5b3a8f] font-semibold">Browse our collection of limited-edition digital art</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-[#1a1a3e]">CATEGORIES</h2>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Sort and Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#6c757d] font-semibold">
            {loading ? "Loading..." : `${products.length} products found`}
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[250px] bg-white border-4 border-black font-bold text-black hover:bg-[#e9ecef] transition-colors">
              <SelectValue>
                {getSortLabel(sortBy)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border-4 border-black">
              <SelectItem value="created_at" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                NEWEST FIRST
              </SelectItem>
              <SelectItem value="price_asc" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                PRICE: LOW TO HIGH
              </SelectItem>
              <SelectItem value="price_desc" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                PRICE: HIGH TO LOW
              </SelectItem>
              <SelectItem value="popularity" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                MOST POPULAR
              </SelectItem>
              <SelectItem value="rating" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                HIGHEST RATED
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d]">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
