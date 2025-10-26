"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProductManagementPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false })

      setProducts(data || [])
    } catch (error) {
      console.error("[Group9] Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStock = async (productId: string, newStock: number) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId)

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Stock updated",
        description: "Product stock has been updated successfully",
      })

      fetchProducts()
    } catch (error) {
      console.error("[Group9] Error updating stock:", error)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admin">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">PRODUCT MANAGEMENT</h1>
              <p className="text-[#6c757d] font-semibold">{products.length} products in inventory</p>
            </div>
            <Button className="bg-[#6bcf7f] hover:bg-[#5ab86f] text-black border-4 border-black font-bold">
              <Plus className="h-4 w-4 mr-2" />
              ADD PRODUCT
            </Button>
          </div>

          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-4 border-black max-w-md"
          />
        </div>

        <div className="bg-white border-4 border-black pixel-shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#5b3a8f] text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold border-r-4 border-black">PRODUCT</th>
                  <th className="px-6 py-4 text-left font-bold border-r-4 border-black">CATEGORY</th>
                  <th className="px-6 py-4 text-left font-bold border-r-4 border-black">PRICE</th>
                  <th className="px-6 py-4 text-left font-bold border-r-4 border-black">STOCK</th>
                  <th className="px-6 py-4 text-left font-bold border-r-4 border-black">RATING</th>
                  <th className="px-6 py-4 text-left font-bold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"}>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-[#4ecdc4] border-2 border-black flex-shrink-0">
                          <Image
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1a3e]">{product.name}</p>
                          {product.is_limited_edition && (
                            <span className="text-xs bg-[#ff6b9d] text-white px-2 py-0.5 border border-black font-bold">
                              LIMITED
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="text-sm text-[#6c757d] font-semibold">{product.categories?.name || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="font-bold text-[#5b3a8f]">${product.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <Input
                        type="number"
                        value={product.stock}
                        onChange={(e) => updateStock(product.id, Number.parseInt(e.target.value) || 0)}
                        className="w-20 border-2 border-black text-center font-bold"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="font-bold text-[#1a1a3e]">
                        {product.rating.toFixed(1)} ({product.review_count})
                      </span>
                    </td>
                    <td className="px-6 py-4 border-t-4 border-black">
                      <div className="flex gap-2">
                        <Button size="icon" className="bg-[#4ecdc4] hover:bg-[#3dbdb4] border-2 border-black">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="bg-[#dc3545] hover:bg-[#c82333] text-white border-2 border-black"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
