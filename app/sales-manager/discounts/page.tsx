"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Percent, Plus, Tag, Calendar, Bell } from "lucide-react"

interface Product {
  product_id: number
  name: string
  price: number
  quantity_in_stocks: number
}

interface DiscountCampaign {
  discount_id: number
  discount_percentage: number
  start_date: string
  end_date: string
  created_at: string
}

export default function DiscountCampaignsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // New campaign form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [discountPercentage, setDiscountPercentage] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [creating, setCreating] = useState(false)

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

      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("discount_campaigns")
        .select("*")
        .order("created_at", { ascending: false })

      if (!campaignsError && campaignsData) {
        setCampaigns(campaignsData)
      }

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("product_id, name, price, quantity_in_stocks")
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

    if (!startDate || !endDate) {
      toast({
        title: "Dates required",
        description: "Please select start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const supabase = getSupabaseBrowserClient()
      
      // Create discount campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("discount_campaigns")
        .insert({
          discount_percentage: discount,
          start_date: startDate,
          end_date: endDate,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Link products to campaign
      const campaignProducts = selectedProducts.map(productId => ({
        discount_id: campaign.discount_id,
        product_id: productId,
      }))

      const { error: linkError } = await supabase
        .from("campaign_products")
        .insert(campaignProducts)

      if (linkError) throw linkError

      // Call discount function to apply discounts and notify users
      const { error: applyError } = await supabase.rpc("apply_discount_to_products", {
        p_discount_id: campaign.discount_id,
      })

      if (applyError) {
        console.error("[Group9] Error applying discount:", applyError)
        // Don't throw - campaign was created successfully
      }

      toast({
        title: "Campaign created",
        description: `Discount campaign created successfully. ${selectedProducts.length} product(s) discounted. Users with these items in their wishlist have been notified.`,
      })

      // Reset form
      setShowCreateForm(false)
      setSelectedProducts([])
      setDiscountPercentage("")
      setStartDate("")
      setEndDate("")

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const isActiveCampaign = (campaign: DiscountCampaign) => {
    const now = new Date()
    const start = new Date(campaign.start_date)
    const end = new Date(campaign.end_date)
    return now >= start && now <= end
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
            <h2 className="font-bold text-2xl text-[#1a1a3e] mb-6 flex items-center gap-2">
              <Tag className="h-6 w-6" />
              NEW DISCOUNT CAMPAIGN
            </h2>

            {/* Date Range */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
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
                  placeholder="e.g., 20"
                  className="border-4 border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1a1a3e] mb-2">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-4 border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1a1a3e] mb-2">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-4 border-black"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a3e] mb-3">
                Select Products ({selectedProducts.length} selected)
              </label>
              <div className="max-h-64 overflow-y-auto border-4 border-black bg-[#f8f9fa] p-4">
                <div className="grid md:grid-cols-2 gap-3">
                  {products.map((product) => (
                    <label
                      key={product.product_id}
                      className={`flex items-center gap-3 p-3 border-2 border-black cursor-pointer transition-colors ${
                        selectedProducts.includes(product.product_id)
                          ? "bg-[#4ecdc4]"
                          : "bg-white hover:bg-[#e9ecef]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.product_id)}
                        onChange={() => toggleProductSelection(product.product_id)}
                        className="w-5 h-5"
                      />
                      <div className="flex-grow">
                        <div className="font-bold text-[#1a1a3e]">{product.name}</div>
                        <div className="text-sm text-[#6c757d]">
                          ${product.price.toFixed(2)} • Stock: {product.quantity_in_stocks}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
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
                  setStartDate("")
                  setEndDate("")
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
                  const active = isActiveCampaign(campaign)
                  return (
                    <div
                      key={campaign.discount_id}
                      className={`border-4 border-black p-4 ${
                        active ? "bg-[#6bcf7f]" : "bg-[#f8f9fa]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
                              {campaign.discount_percentage}% OFF
                            </span>
                            {active && (
                              <span className="bg-[#28a745] text-white px-3 py-1 text-xs font-bold border-2 border-black">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#6c757d]">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className="font-bold">
                                {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                              </span>
                            </div>
                            <div className="text-xs">
                              Created: {formatDate(campaign.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm text-[#6c757d]">
                            ID: #{campaign.discount_id}
                          </div>
                        </div>
                      </div>
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

