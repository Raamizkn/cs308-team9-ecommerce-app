"use client"

import { useEffect, useState } from "react"
import { PixelHeader } from "@/components/pixel-header"
import { ProductCard } from "@/components/product-card"
import { CategoryFilter } from "@/components/category-filter"
import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

interface Product {
  pid: number
  id: string // Added during transformation
  name: string
  description: string | null
  price: number
  image_url?: string
  rating: number
  review_count: number
  is_limited_edition: boolean
  stock_quantity: number
  stock: number // Added during transformation
}

interface Category {
  cid: number
  name: string
}

export default function HomePage() {
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
  }, [selectedCategory, searchQuery, sortBy])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error("[Group9] Error fetching categories:", error)
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
      }))
      setProducts(transformedProducts)
    } catch (error) {
      console.error("[Group9] Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const cycleSortBy = () => {
    const sortOptions = ["created_at", "price_asc", "price_desc", "rating"]
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length
    setSortBy(sortOptions[nextIndex])
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case "price_asc":
        return "PRICE: LOW TO HIGH"
      case "price_desc":
        return "PRICE: HIGH TO LOW"
      case "rating":
        return "HIGHEST RATED"
      default:
        return "NEWEST FIRST"
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#5b3a8f] via-[#4ecdc4] to-[#ffb347] border-b-4 border-black">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-6xl text-white mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] leading-tight">
            PIXELVAULT
          </h1>
          <p className="text-xl md:text-2xl text-white font-bold mb-8 drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
            Collect Limited-Edition Digital Art
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4 text-[#1a1a3e]">CATEGORIES</h2>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6c757d] font-semibold">
              {loading ? "Loading..." : `${products.length} products found`}
            </p>
            <Button
              onClick={cycleSortBy}
              className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {getSortLabel()}
            </Button>
          </div>
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

      {/* Footer */}
      <footer className="bg-[#1a1a3e] border-t-4 border-black mt-20">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white font-semibold">© 2025 PixelVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
