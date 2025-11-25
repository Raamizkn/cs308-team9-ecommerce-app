"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Percent, Plus, Tag, Bell, Trash2, X } from "lucide-react"

interface Product {
  pid: number
  name: string
  price: number
  stock_quantity: number
  cid: number
}

interface Category {
  cid: number
  name: string
}

interface DiscountCampaign {
  did: number
  rate: number
  products: Product[]
  product_count: number
}

export default function DiscountCampaignsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // New campaign form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [discountPercentage, setDiscountPercentage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  const checkAccessAndLoadData = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: salesManagerData, error: roleError } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !salesManagerData) {
        router.push("/login")
        return
      }

      // Load campaigns with product count
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("discount_campaigns")
        .select("did, rate")

      if (!campaignsError && campaignsData) {
        // For each campaign, get the products
        const campaignsWithProducts = await Promise.all(
          campaignsData.map(async (campaign) => {
            const { data: appliesData } = await supabase
              .from("applies_to")
              .select(`
                pid,
                products_belong_to (
                  pid,
                  name,
                  price,
                  stock_quantity,
                  cid
                )
              `)
              .eq("did", campaign.did)

            const products = (appliesData || []).map((item: any) => ({
              pid: item.products_belong_to.pid,
              name: item.products_belong_to.name,
              price: item.products_belong_to.price,
              stock_quantity: item.products_belong_to.stock_quantity,
              cid: item.products_belong_to.cid,
            }))

            return {
              did: campaign.did,
              rate: campaign.rate,
              products,
              product_count: products.length,
            }
          })
        )

        setCampaigns(campaignsWithProducts)
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("cid, name")
        .order("name")

      if (!categoriesError && categoriesData) {
        setCategories(categoriesData)
      }

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products_belong_to")
        .select("pid, name, price, stock_quantity, cid")
        .order("name")

      if (!productsError && productsData) {
        setProducts(productsData)
      }
    } catch (error) {
      console.error("[Group9] Error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const toggleProductSelection = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    } else {
      setSelectedProducts([...selectedProducts, productId])
    }
  }

  const createCampaign = async () => {
    // Validation
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product for the discount",
        variant: "destructive",
      })
      return
    }

    const discount = parseFloat(discountPercentage)
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      toast({
        title: "Invalid discount",
        description: "Discount must be between 0 and 100",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const supabase = getSupabaseBrowserClient()
      
      // Convert percentage to rate (0-1)
      const rate = discount / 100

      // Create discount campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("discount_campaigns")
        .insert({
          rate: rate,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Use the apply_discount_to_products function to link products
      const { error: applyError } = await supabase.rpc("apply_discount_to_products", {
        target_did: campaign.did,
        target_pids: selectedProducts,
      })

      if (applyError) {
        console.error("[Group9] Error applying discount:", applyError)
        throw applyError
      }

      // Get users who have these products in their wishlist
      const { data: wishlistUsers, error: wishlistError } = await supabase
        .from("wish_for")
        .select("uid, pid")
        .in("pid", selectedProducts)

      if (!wishlistError && wishlistUsers && wishlistUsers.length > 0) {
        // Get unique user IDs
        const uniqueUserIds = [...new Set(wishlistUsers.map((w: any) => w.uid))]
        
        toast({
          title: "Campaign created & users notified",
          description: `${discount}% discount applied to ${selectedProducts.length} product(s). ${uniqueUserIds.length} user(s) with these items in their wishlist have been notified.`,
        })
      } else {
        toast({
          title: "Campaign created",
          description: `${discount}% discount applied to ${selectedProducts.length} product(s).`,
        })
      }

      // Reset form
      setShowCreateForm(false)
      setSelectedProducts([])
      setDiscountPercentage("")
      setSearchTerm("")
      setSelectedCategory("all")

      // Reload campaigns
      await checkAccessAndLoadData()
    } catch (error) {
      console.error("[Group9] Error creating campaign:", error)
      toast({
        title: "Error",
        description: "Failed to create discount campaign",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const deleteCampaign = async (did: number) => {
    if (!confirm("Are you sure you want to delete this discount campaign? This will remove the discount from all products.")) {
      return
    }

    setDeleting(did)
    try {
      const supabase = getSupabaseBrowserClient()

      // Delete campaign (applies_to will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from("discount_campaigns")
        .delete()
        .eq("did", did)

      if (error) throw error

      toast({
        title: "Campaign deleted",
        description: "Discount campaign has been removed",
      })

      // Reload campaigns
      await checkAccessAndLoadData()
    } catch (error) {
      console.error("[Group9] Error deleting campaign:", error)
      toast({
        title: "Error",
        description: "Failed to delete discount campaign",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const getFilteredProducts = () => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.cid.toString() === selectedCategory
      const matchesSearch = searchTerm === "" || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }

  const getCategoryName = (cid: number) => {
    return categories.find((c) => c.cid === cid)?.name || "Unknown"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#4ecdc4] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/sales-manager/dashboard">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
                DISCOUNT CAMPAIGNS
              </h1>
              <p className="text-[#6c757d] font-semibold">
                Create discounts and notify wishlist users
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              CREATE CAMPAIGN
            </Button>
          </div>
        </div>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <div className="bg-white border-4 border-black p-6 pixel-shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-2xl text-[#1a1a3e] flex items-center gap-2">
                <Tag className="h-6 w-6" />
                NEW DISCOUNT CAMPAIGN
              </h2>
              <Button
                size="sm"
                onClick={() => {
                  setShowCreateForm(false)
                  setSelectedProducts([])
                  setDiscountPercentage("")
                  setSearchTerm("")
                  setSelectedCategory("all")
                }}
                className="bg-white hover:bg-[#e9ecef] text-black border-2 border-black"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Discount Percentage */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">
                Discount Percentage (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="e.g., 20 for 20% off"
                className="border-4 border-black"
              />
              <p className="text-xs text-[#6c757d] mt-1">
                Enter a value between 0 and 100. Example: 25 = 25% discount
              </p>
            </div>

            {/* Product Filters */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-[#1a1a3e] mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border-4 border-black font-bold bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.cid} value={category.cid.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1a1a3e] mb-2">
                  Search Products
                </label>
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by product name..."
                  className="border-4 border-black"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a3e] mb-3">
                Select Products ({selectedProducts.length} selected)
              </label>
              <div className="max-h-96 overflow-y-auto border-4 border-black bg-[#f8f9fa] p-4">
                <div className="grid md:grid-cols-2 gap-3">
                  {getFilteredProducts().map((product) => (
                    <label
                      key={product.pid}
                      className={`flex items-center gap-3 p-3 border-2 border-black cursor-pointer transition-colors ${
                        selectedProducts.includes(product.pid)
                          ? "bg-[#4ecdc4]"
                          : "bg-white hover:bg-[#e9ecef]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.pid)}
                        onChange={() => toggleProductSelection(product.pid)}
                        className="w-5 h-5"
                      />
                      <div className="flex-grow">
                        <div className="font-bold text-[#1a1a3e]">{product.name}</div>
                        <div className="text-sm text-[#6c757d]">
                          ${product.price.toFixed(2)} • Stock: {product.stock_quantity}
                        </div>
                        <div className="text-xs text-[#6c757d]">
                          {getCategoryName(product.cid)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {getFilteredProducts().length === 0 && (
                  <p className="text-center text-[#6c757d] py-8">
                    No products found matching your filters
                  </p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#d1ecf1] border-4 border-black p-4 mb-6">
              <p className="text-sm font-bold text-[#0c5460] flex items-start gap-2">
                <Bell className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  When you create this campaign, the discount will be automatically applied to the
                  selected products, and all users who have these products in their wishlist will be
                  notified.
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={createCampaign}
                disabled={creating}
                className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-4 border-black font-bold"
              >
                {creating ? "CREATING..." : "CREATE & NOTIFY USERS"}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  setSelectedProducts([])
                  setDiscountPercentage("")
                  setSearchTerm("")
                  setSelectedCategory("all")
                }}
                disabled={creating}
                className="bg-white hover:bg-[#e9ecef] text-black border-4 border-black font-bold"
              >
                CANCEL
              </Button>
            </div>
          </div>
        )}

        {/* Existing Campaigns */}
        <div className="bg-white border-4 border-black pixel-shadow-sm">
          <div className="bg-[#ffb347] border-b-4 border-black p-4">
            <h2 className="font-bold text-2xl text-[#1a1a3e]">EXISTING CAMPAIGNS</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Percent className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
                <p className="text-xl font-bold text-[#6c757d] mb-2">No campaigns yet</p>
                <p className="text-[#6c757d]">Create your first discount campaign to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const discountPercentage = Math.round(campaign.rate * 100)
                  return (
                    <div
                      key={campaign.did}
                      className="border-4 border-black p-6 bg-[#6bcf7f]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e]">
                              {discountPercentage}% OFF
                            </span>
                            <span className="bg-[#28a745] text-white px-3 py-1 text-xs font-bold border-2 border-black">
                              ACTIVE
                            </span>
                          </div>
                          <div className="text-sm text-[#1a1a3e] font-bold mb-2">
                            Applied to {campaign.product_count} product{campaign.product_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <div className="font-mono text-sm text-[#1a1a3e] font-bold">
                              Campaign ID: #{campaign.did}
                            </div>
                            <div className="text-xs text-[#1a1a3e] mt-1">
                              Rate: {campaign.rate.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => deleteCampaign(campaign.did)}
                            disabled={deleting === campaign.did}
                            className="bg-[#dc3545] hover:bg-[#c82333] text-white border-2 border-black font-bold"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Products in this campaign */}
                      {campaign.products.length > 0 && (
                        <div className="border-t-2 border-black pt-4">
                          <div className="text-xs font-bold text-[#1a1a3e] mb-2">PRODUCTS:</div>
                          <div className="grid md:grid-cols-2 gap-2">
                            {campaign.products.slice(0, 6).map((product) => (
                              <div
                                key={product.pid}
                                className="bg-white border-2 border-black p-2 text-sm"
                              >
                                <div className="font-bold text-[#1a1a3e]">{product.name}</div>
                                <div className="text-xs text-[#6c757d]">
                                  ${product.price.toFixed(2)} → $
                                  {(product.price * (1 - campaign.rate)).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          {campaign.products.length > 6 && (
                            <div className="text-xs text-[#1a1a3e] mt-2 font-bold">
                              + {campaign.products.length - 6} more products
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

