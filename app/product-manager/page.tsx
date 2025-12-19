"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, ClipboardList, PackageCheck, PlusCircle, X, LogOut, Download } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/invoice-pdf"

interface ProductRecord {
  pid: number
  name: string
  sku: string
  category: string
  stock: number
  reorderPoint: number
  price: number
  warehouse: string
}

interface DeliveryRecord {
  id: string
  customer: string
  address: string
  product: string
  quantity: number
  total: number
  status: "packing" | "in-transit" | "delivered"
  dueDate: string
  orderId?: string // Store actual order ID for status updates
  orderItemId?: string // Store order item ID
}

interface InvoiceRecord {
  invoiceId: string
  orderId: string
  actualOrderId: string // Store the actual UUID for PDF generation
  customer: string
  total: number
  status: "awaiting-shipment" | "shipped" | "delivered"
  createdAt: string
}

const mockProducts: ProductRecord[] = [
  {
    pid: 101,
    name: "Retro Pixel Console",
    sku: "PV-CON-101",
    category: "Consoles",
    stock: 42,
    reorderPoint: 20,
    price: 299.99,
    warehouse: "Central",
  },
  {
    pid: 205,
    name: "Arcade Fight Stick",
    sku: "PV-ACC-205",
    category: "Accessories",
    stock: 12,
    reorderPoint: 15,
    price: 149.0,
    warehouse: "Central",
  },
  {
    pid: 309,
    name: "8-bit Collector Figure",
    sku: "PV-COL-309",
    category: "Collectibles",
    stock: 5,
    reorderPoint: 12,
    price: 89.99,
    warehouse: "East Hub",
  },
  {
    pid: 411,
    name: "Limited Edition Cartridge Lamp",
    sku: "PV-HOME-411",
    category: "Home",
    stock: 27,
    reorderPoint: 10,
    price: 59.99,
    warehouse: "West Hub",
  },
]

export default function ProductManagerDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [categories, setCategories] = useState<Array<{ cid: number; name: string }>>([])
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [loadingDeliveries, setLoadingDeliveries] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null)
  const [deliveryPage, setDeliveryPage] = useState(1)

  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})
  const [newCategory, setNewCategory] = useState("")
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    reorderPoint: "",
    distributor: "Spin Master",
    description: "",
    model: "",
    warranty: "",
  })

  // Check product manager access on mount
  useEffect(() => {
    checkProductManagerAccess()
  }, [])

  // Reset page if current page would be empty
  useEffect(() => {
    const itemsPerPage = 10
    const totalPages = Math.ceil(deliveries.length / itemsPerPage)
    if (deliveryPage > totalPages && totalPages > 0) {
      setDeliveryPage(totalPages)
    } else if (deliveries.length > 0 && deliveryPage < 1) {
      setDeliveryPage(1)
    }
  }, [deliveries.length, deliveryPage])

  const checkProductManagerAccess = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      // Check if user is a product manager
      const { data: productManagerData, error: roleError } = await supabase
        .from("product_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !productManagerData) {
        router.push("/login")
        return
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", authUser.id)
        .single()

      setUser({
        ...authUser,
        name: profileData?.name || authUser.email?.split("@")[0] || "Product Manager",
      })

      // Fetch products, invoices, and deliveries after access is confirmed
      fetchProducts()
      fetchInvoices()
      fetchDeliveries()
    } catch (error) {
      console.error("[Group9] Error checking product manager access:", error)
      router.push("/login")
    } finally {
      setCheckingAccess(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/product-manager/products")
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch products")
      }
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("[Group9] Error fetching products:", error)
      toast({
        title: "Error loading products",
        description: error instanceof Error ? error.message : "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveries = async () => {
    try {
      setLoadingDeliveries(true)
      const supabase = getSupabaseBrowserClient()
      
      // Fetch all orders with their items, products, and customer info via join
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          status,
          shipping_address,
          user_id,
          order_items (
            id,
            quantity,
            price,
            products_belong_to (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (ordersError) {
        throw ordersError
      }

      // Fetch customer names from profiles
      const userIds = [...new Set((ordersData || []).map((order: any) => order.user_id).filter(Boolean))]
      const profilesMap: Record<string, string> = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", userIds)
        
        if (profilesError) {
          console.error("[Group9] Error fetching profiles for deliveries:", profilesError)
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = profile.name || "Customer"
          })
        }
      }

      // Transform orders into delivery records
      const deliveryRecords: DeliveryRecord[] = (ordersData || []).flatMap((order: any) => {
        // Get customer name from profiles map, fallback to "Customer" or "Guest Customer"
        const customerName = order.user_id 
          ? (profilesMap[order.user_id] || "Customer")
          : "Guest Customer"
        
        // Map each order item to a delivery record
        return (order.order_items || []).map((item: any, index: number) => {
          // Map order status to delivery status
          let deliveryStatus: "packing" | "in-transit" | "delivered" = "packing"
          if (order.status === "delivered") {
            deliveryStatus = "delivered"
          } else if (order.status === "in-transit") {
            deliveryStatus = "in-transit"
          } else {
            deliveryStatus = "packing" // Maps to 'processing' in DB
          }

          // Calculate due date (7 days from order creation)
          const orderDate = new Date(order.created_at)
          const dueDate = new Date(orderDate)
          dueDate.setDate(dueDate.getDate() + 7)

          return {
            id: `${order.id.slice(0, 8).toUpperCase()}-${index + 1}`,
            customer: customerName,
            address: order.shipping_address || "Address not provided",
            product: item.products_belong_to?.name || "Unknown Product",
            quantity: item.quantity,
            total: Number(item.price) * item.quantity,
            status: deliveryStatus,
            dueDate: dueDate.toISOString().split('T')[0],
            orderId: order.id, // Store actual order ID for status updates
            orderItemId: item.id, // Store order item ID
          }
        })
      })

      setDeliveries(deliveryRecords)
    } catch (error) {
      console.error("[Group9] Error fetching deliveries:", error)
      toast({
        title: "Error loading deliveries",
        description: error instanceof Error ? error.message : "Failed to fetch deliveries",
        variant: "destructive",
      })
      // Fallback to empty array on error
      setDeliveries([])
    } finally {
      setLoadingDeliveries(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true)
      const supabase = getSupabaseBrowserClient()
      
      // Fetch all orders with their items, products, and customer info via join
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          status,
          shipping_address,
          user_id,
          order_items (
            id,
            quantity,
            price,
            products_belong_to (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (ordersError) {
        throw ordersError
      }

      // Fetch customer names from profiles
      const userIds = [...new Set((ordersData || []).map((order: any) => order.user_id).filter(Boolean))]
      const profilesMap: Record<string, string> = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", userIds)
        
        if (profilesError) {
          console.error("[Group9] Error fetching profiles for invoices:", profilesError)
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = profile.name || "Customer"
          })
        }
      }

      // Transform orders into invoice records
      const invoiceRecords: InvoiceRecord[] = (ordersData || []).map((order: any) => {
        // Get customer name from profiles map, fallback to "Customer" or "Guest Customer"
        const customerName = order.user_id 
          ? (profilesMap[order.user_id] || "Customer")
          : "Guest Customer"
        
        // Determine status for display
        let displayStatus: "awaiting-shipment" | "shipped" | "delivered" = "awaiting-shipment"
        if (order.status === "delivered") {
          displayStatus = "delivered"
        } else if (order.status === "in-transit") {
          displayStatus = "shipped" // Invoices use 'shipped' for 'in-transit'
        } else {
          displayStatus = "awaiting-shipment"
        }

        return {
          invoiceId: `INV-${order.id.slice(0, 8).toUpperCase()}`,
          orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
          actualOrderId: order.id, // Store the actual UUID
          customer: customerName,
          total: Number(order.total) || 0,
          status: displayStatus,
          createdAt: order.created_at,
        }
      })

      setInvoices(invoiceRecords)
    } catch (error) {
      console.error("[Group9] Error fetching invoices:", error)
      toast({
        title: "Error loading invoices",
        description: error instanceof Error ? error.message : "Failed to fetch invoices",
        variant: "destructive",
      })
      // Fallback to empty array on error
      setInvoices([])
    } finally {
      setLoadingInvoices(false)
    }
  }

  const downloadInvoicePDF = async (orderId: string) => {
    setDownloadingInvoiceId(orderId)
    try {
      const supabase = getSupabaseBrowserClient()
      
      // Fetch full order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*, products_belong_to(*))")
        .eq("id", orderId)
        .single()

      if (orderError || !order) {
        throw new Error("Order not found")
      }

      // Fetch customer information
      let customerName = "Customer"
      let customerEmail = "customer@pixelvault.com"
      
      if (order.user_id) {
        try {
          // Fetch customer name from profiles
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("uid", order.user_id)
            .maybeSingle()
          
          if (profileData?.name) {
            customerName = profileData.name
          }

          // Fetch customer email using admin API (for product managers)
          const emailResponse = await fetch(`/api/admin/user-email?user_id=${order.user_id}`)
          if (emailResponse.ok) {
            const emailData = await emailResponse.json()
            if (emailData.email) {
              customerEmail = emailData.email
            }
          } else {
            console.error("[Group9] Error fetching customer email:", await emailResponse.text())
          }
        } catch (error) {
          console.error("[Group9] Error fetching user info:", error)
        }
      }

      // Use tax_amount, subtotal, and total from order (same as customer side)
      // This ensures product manager sees exactly what customer sees
      const subtotal = order.subtotal || order.order_items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0
      const shipping = 0
      const tax = order.tax_amount || 0
      const total = order.total || subtotal + tax

      // Prepare invoice data (exactly matching customer side format)
      const invoiceData = {
        orderId: order.id,
        orderDate: order.created_at,
        customerName: customerName,
        customerEmail: customerEmail,
        shippingAddress: order.shipping_address || "N/A",
        items: order.order_items?.map((item: any) => ({
          id: item.id,
          product_name: item.products_belong_to?.name || item.products?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })) || [],
        subtotal,
        shipping,
        tax,
        total,
        status: order.status,
        paymentMethod: order.payment_method || "Credit Card",
      }

      // Generate PDF
      const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob()

      // Download PDF
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `pixelvault-invoice-${order.id.substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Invoice downloaded",
        description: "Your invoice PDF has been saved successfully",
      })
    } catch (error) {
      console.error("[Group9] Error generating invoice:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("[Group9] Logout error:", error)
      toast({
        title: "Logout failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true)
        const response = await fetch("/api/categories")
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to fetch categories")
        }
        const data = await response.json()
        const categoriesList = (data.categories || []).map((cat: { cid: number; name: string }) => ({
          cid: cat.cid,
          name: cat.name,
        }))
        setCategories(categoriesList)
        // Set default category if available
        if (categoriesList.length > 0 && !newProduct.category) {
          setNewProduct((prev) => ({ ...prev, category: categoriesList[0].name }))
        }
      } catch (error) {
        console.error("[Group9] Error fetching categories:", error)
        toast({
          title: "Error loading categories",
          description: error instanceof Error ? error.message : "Failed to fetch categories",
          variant: "destructive",
        })
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [toast])

  const handleStockUpdate = async (pid: number) => {
    const amount = Number(stockEdits[pid])

    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Invalid adjustment",
        description: "Enter a non-zero numeric value to increase or decrease stock",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/product-manager/products/${pid}/stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adjustment: amount }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update stock")
      }

      const data = await response.json()

      // Update local state
      setProducts((prev) =>
        prev.map((product) =>
          product.pid === pid ? { ...product, stock: data.stock } : product,
        ),
      )

      setStockEdits((prev) => ({ ...prev, [pid]: "" }))

      toast({
        title: "Stock updated",
        description: `Stock successfully ${amount > 0 ? "increased" : "decreased"} by ${Math.abs(amount)} units`,
      })
    } catch (error) {
      console.error("[Group9] Error updating stock:", error)
      toast({
        title: "Error updating stock",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a category name",
        variant: "destructive",
      })
      return
    }

    // Check if category already exists locally
    if (categories.some((cat) => cat.name.toLowerCase() === newCategory.trim().toLowerCase())) {
      toast({
        title: "Category exists",
        description: "This category already exists",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create category")
      }

      const data = await response.json()
      
      // Add new category to local state
      setCategories((prev) => [...prev, { cid: data.category.cid, name: data.category.name }])
      setNewCategory("")
      
      toast({
        title: "Category added",
        description: `${data.category.name} has been successfully added`,
      })
    } catch (error) {
      console.error("[Group9] Error adding category:", error)
      toast({
        title: "Error adding category",
        description: error instanceof Error ? error.message : "Failed to add category",
        variant: "destructive",
      })
    }
  }

  const handleRemoveCategory = async (categoryToRemove: { cid: number; name: string }) => {
    if (!confirm(`Are you sure you want to delete "${categoryToRemove.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories?cid=${categoryToRemove.cid}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete category")
      }

      // Remove category from local state
      setCategories((prev) => {
        const updated = prev.filter((category) => category.cid !== categoryToRemove.cid)
        
        // If the deleted category was selected for new product, update it
        if (newProduct.category === categoryToRemove.name) {
          setNewProduct((prevProduct) => ({
            ...prevProduct,
            category: updated.length > 0 ? updated[0]?.name || "" : "",
          }))
        }
        
        return updated
      })
      
      toast({
        title: "Category removed",
        description: `${categoryToRemove.name} has been successfully removed`,
        variant: "destructive",
      })
    } catch (error) {
      console.error("[Group9] Error removing category:", error)
      toast({
        title: "Error removing category",
        description: error instanceof Error ? error.message : "Failed to remove category",
        variant: "destructive",
      })
    }
  }

  const handleRemoveProduct = async (pid: number) => {
    if (!confirm("Are you sure you want to remove this product? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/product-manager/products/${pid}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove product")
      }

      // Update local state
      setProducts((prev) => prev.filter((product) => product.pid !== pid))

      toast({
        title: "Product removed",
        description: "Product has been successfully removed from the database",
        variant: "destructive",
      })
    } catch (error) {
      console.error("[Group9] Error removing product:", error)
      toast({
        title: "Error removing product",
        description: error instanceof Error ? error.message : "Failed to remove product",
        variant: "destructive",
      })
    }
  }

  const handleDeliveryStatus = async (id: string, status: DeliveryRecord["status"]) => {
    try {
      const delivery = deliveries.find((d) => d.id === id)
      if (!delivery || !delivery.orderId) {
        toast({
          title: "Error",
          description: "Order ID not found for this delivery",
          variant: "destructive",
        })
        return
      }

      const supabase = getSupabaseBrowserClient()
      
      // Map delivery status to order status
      // Database allows: 'processing', 'in-transit', 'delivered', 'cancelled'
      let orderStatus: string = "processing"
      if (status === "delivered") {
        orderStatus = "delivered"
      } else if (status === "in-transit") {
        orderStatus = "in-transit"  // Fixed: was "shipped" which is not a valid status
      } else {
        // "packing" maps to "processing"
        orderStatus = "processing"
      }

      // Update order status in database
      const { error } = await supabase
        .from("orders")
        .update({ status: orderStatus })
        .eq("id", delivery.orderId)

      if (error) {
        throw error
      }

      // Update local state
      setDeliveries((prev) => prev.map((delivery) => (delivery.id === id ? { ...delivery, status } : delivery)))
      
      toast({
        title: "Delivery updated",
        description: `Delivery ${id} marked as ${status}`,
      })
    } catch (error) {
      console.error("[Group9] Error updating delivery status:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update delivery status",
        variant: "destructive",
      })
    }
  }

  const handleCreateProduct = async () => {
    const { name, sku, category, price, stock, distributor, description, model, warranty } = newProduct

    if (!name || !price || stock === undefined || !category) {
      toast({
        title: "Missing information",
        description: "Name, price, stock, and category are required",
        variant: "destructive",
      })
      return
    }

    const parsedStock = Number(stock)
    const parsedPrice = Number(price)

    if (isNaN(parsedStock) || isNaN(parsedPrice) || parsedStock < 0 || parsedPrice < 0) {
      toast({
        title: "Invalid values",
        description: "Price and stock must be non-negative numbers",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/product-manager/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sku: sku || null,
          category,
          price: parsedPrice,
          stock: parsedStock,
          distributor_info: distributor,
          description: description || null,
          model: model || null,
          warranty_status: warranty || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create product")
      }

      const data = await response.json()

      // Add new product to local state
      setProducts((prev) => [data.product, ...prev])

      // Reset form
      setNewProduct({
        name: "",
        sku: "",
        category,
        price: "",
        stock: "",
        reorderPoint: "",
        distributor: "Spin Master",
        description: "",
        model: "",
        warranty: "",
      })

      toast({
        title: "Product created",
        description: `${name} has been successfully added to the database`,
      })
    } catch (error) {
      console.error("[Group9] Error creating product:", error)
      toast({
        title: "Error creating product",
        description: error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      })
    }
  }

  if (checkingAccess) {
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
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
                PRODUCT MANAGER CONTROL ROOM
              </h1>
              <p className="text-[#6c757d] font-semibold">
                Welcome back, {user?.name || "Product Manager"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogout}
                className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold"
              >
                <LogOut className="h-4 w-4 mr-2" />
                LOGOUT
              </Button>
              <Link href="/">
                <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Store
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Inventory Management */}
        <section className="border-4 border-black bg-white pixel-shadow-sm mb-10">
          <div className="border-b-4 border-black p-6">
            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Inventory & Stock Control</h2>
            <p className="text-[#6c757d]">Adjust stock counts or remove products entirely.</p>
          </div>
          {loading ? (
            <div className="p-6 text-center text-[#6c757d]">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-[#6c757d]">
              No products found. Add your first product below.
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {products.map((product) => {
              const isLow = product.stock <= 10 // Low stock threshold
              return (
                <div key={product.pid} className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-[#1a1a3e]">{product.name}</h3>
                      {isLow ? (
                        <span className="px-3 py-1 bg-[#dc3545] text-white text-xs font-bold border-2 border-black">
                          REORDER NOW
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#6bcf7f] text-[#1a1a3e] text-xs font-bold border-2 border-black">
                          OK
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6c757d] font-mono">SKU: {product.sku} • {product.category}</p>
                    <p className="text-sm text-[#6c757d]">Distributor: {product.warehouse}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-[#1a1a3e]">
                      <span>Stock: {product.stock} units</span>
                      <span>Price: ${product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Input
                      placeholder="+/- units"
                      value={stockEdits[product.pid] ?? ""}
                      onChange={(event) =>
                        setStockEdits((prev) => ({
                          ...prev,
                          [product.pid]: event.target.value,
                        }))
                      }
                      className="border-2 border-black bg-[#f8f9fa]"
                    />
                    <Button
                      onClick={() => handleStockUpdate(product.pid)}
                      className="bg-[#5b3a8f] text-white border-4 border-black font-bold"
                    >
                      UPDATE STOCK
                    </Button>
                    <Button
                      onClick={() => handleRemoveProduct(product.pid)}
                      className="bg-[#dc3545] text-white border-4 border-black font-bold"
                    >
                      REMOVE PRODUCT
                    </Button>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </section>

        {/* New Product */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Draft New Product</h2>
              <p className="text-[#6c757d]">Fill in core details and queue for approval</p>
            </div>
            <div className="p-6 space-y-4">
              <Input
                placeholder="Product name"
                value={newProduct.name}
                onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })}
                className="border-2 border-black bg-[#f8f9fa]"
              />
              <Input
                placeholder="SKU (unique identifier)"
                value={newProduct.sku}
                onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value })}
                className="border-2 border-black bg-[#f8f9fa]"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  disabled={loadingCategories}
                >
                  <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                    <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.cid} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newProduct.distributor}
                  onValueChange={(value) => setNewProduct({ ...newProduct, distributor: value })}
                >
                  <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                    <SelectValue placeholder="Distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Spin Master", "CD Projekt Red", "The Pokemon Company", "Wizarding World Inc."].map((distributor) => (
                      <SelectItem key={distributor} value={distributor}>
                        {distributor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
                <Input
                  type="number"
                  placeholder="Starting stock"
                  value={newProduct.stock}
                  onChange={(event) => setNewProduct({ ...newProduct, stock: event.target.value })}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
              </div>
              <Input
                placeholder="Model"
                value={newProduct.model}
                onChange={(event) => setNewProduct({ ...newProduct, model: event.target.value })}
                className="border-2 border-black bg-[#f8f9fa]"
              />
              <Input
                placeholder="Warranty Status"
                value={newProduct.warranty}
                onChange={(event) => setNewProduct({ ...newProduct, warranty: event.target.value })}
                className="border-2 border-black bg-[#f8f9fa]"
              />
              <Textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })}
                className="border-2 border-black bg-[#f8f9fa]"
                rows={3}
              />
              <Button onClick={handleCreateProduct} className="w-full bg-[#4ecdc4] text-[#1a1a3e] border-4 border-black font-bold">
                <PlusCircle className="h-4 w-4 mr-2" />
                SAVE PRODUCT DRAFT
              </Button>
            </div>
          </div>

          {/* Category Management */}
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Category & Catalog Rules</h2>
              <p className="text-[#6c757d]">Create curated groupings for storefront navigation</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category.cid}
                    className="flex items-center gap-2 px-3 py-2 bg-[#e9ecef] border-2 border-black text-sm font-bold text-[#1a1a3e]"
                  >
                    {category.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="text-[#dc3545] hover:text-black"
                      aria-label={`Remove ${category.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
                <Button onClick={handleAddCategory} className="bg-[#1a1a3e] text-white border-4 border-black font-bold">
                  ADD
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Queue */}
        <section className="border-4 border-black bg-white pixel-shadow-sm mb-10">
          <div className="border-b-4 border-black p-6">
            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Delivery & Fulfillment Board</h2>
            <p className="text-[#6c757d]">View every delivery record and update its status.</p>
          </div>
          {loadingDeliveries ? (
            <div className="p-6 text-center text-[#6c757d]">
              Loading deliveries...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-6 text-center text-[#6c757d]">
              <p className="font-bold mb-2">No deliveries found</p>
              <p className="text-sm">Orders will appear here once customers place orders.</p>
            </div>
          ) : (
            <>
              <div className="divide-y-2 divide-black">
                {(() => {
                  const itemsPerPage = 10
                  const startIndex = (deliveryPage - 1) * itemsPerPage
                  const endIndex = startIndex + itemsPerPage
                  const paginatedDeliveries = deliveries.slice(startIndex, endIndex)
                  
                  return paginatedDeliveries.map((delivery) => (
                    <div key={delivery.id} className="p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-[#1a1a3e]">{delivery.product}</h3>
                          <span className="text-xs font-bold border-2 border-black px-3 py-1 bg-white">
                            {delivery.quantity} pcs
                          </span>
                        </div>
                        <p className="text-sm text-[#6c757d] font-mono">
                          Delivery #{delivery.id} • Due {new Date(delivery.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-[#6c757d]">Customer: {delivery.customer}</p>
                        <p className="text-sm text-[#6c757d]">Address: {delivery.address}</p>
                        <p className="text-sm font-bold text-[#1a1a3e] mt-1">Total: ${delivery.total.toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <Select value={delivery.status} onValueChange={(value: DeliveryRecord["status"]) => handleDeliveryStatus(delivery.id, value)}>
                          <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="packing">Packing</SelectItem>
                            <SelectItem value="in-transit">In Transit</SelectItem>
                            <SelectItem 
                              value="delivered"
                              className="bg-[#6bcf7f] text-[#1a1a3e] font-bold hover:bg-[#5bb86f] focus:bg-[#5bb86f] data-[highlighted]:bg-[#5bb86f]"
                            >
                              Delivered
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => handleDeliveryStatus(delivery.id, "delivered")}
                          className="bg-[#6bcf7f] text-[#1a1a3e] border-4 border-black font-bold"
                        >
                          <PackageCheck className="h-4 w-4 mr-2" />
                          MARK DELIVERED
                        </Button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              {/* Pagination Controls */}
              {(() => {
                const itemsPerPage = 10
                const totalPages = Math.ceil(deliveries.length / itemsPerPage)
                return totalPages > 1 ? (
                  <div className="border-t-4 border-black p-6 flex items-center justify-between">
                    <div className="text-sm text-[#6c757d] font-bold">
                      Showing {((deliveryPage - 1) * itemsPerPage) + 1} - {Math.min(deliveryPage * itemsPerPage, deliveries.length)} of {deliveries.length} deliveries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setDeliveryPage(prev => Math.max(1, prev - 1))}
                        disabled={deliveryPage === 1}
                        className="bg-white hover:bg-[#e9ecef] text-black border-2 border-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>
                      <span className="text-sm font-bold text-[#1a1a3e] px-3">
                        Page {deliveryPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setDeliveryPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={deliveryPage === totalPages}
                        className="bg-white hover:bg-[#e9ecef] text-black border-2 border-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null
              })()}
            </>
          )}
        </section>

        {/* Invoices and Review */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Invoice Log</h2>
              <p className="text-[#6c757d]">Read-only list of invoices tied to deliveries.</p>
            </div>
            <div className="p-6 space-y-4">
              {loadingInvoices ? (
                <div className="text-center text-[#6c757d] py-8">
                  Loading invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-[#6c757d] py-8">
                  <p className="font-bold mb-2">No invoices found</p>
                  <p className="text-sm">Orders will appear here once customers place orders.</p>
                </div>
              ) : (
                <>
                  {invoices.map((invoice) => (
                    <div key={invoice.invoiceId} className="border-2 border-black p-4 bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-mono text-[#6c757d]">Invoice #{invoice.invoiceId}</p>
                          <p className="text-lg font-bold text-[#1a1a3e]">Order {invoice.orderId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 border-2 border-black text-xs font-bold whitespace-nowrap ${
                            invoice.status === "delivered" 
                              ? "bg-[#6bcf7f] text-[#1a1a3e]"
                              : invoice.status === "shipped"
                              ? "bg-[#4ecdc4] text-[#1a1a3e]"
                              : "bg-[#ffb347] text-[#1a1a3e]"
                          }`}>
                            {invoice.status.replace("-", " ").toUpperCase()}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => downloadInvoicePDF(invoice.actualOrderId)}
                            disabled={downloadingInvoiceId === invoice.actualOrderId}
                            className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-[#1a1a3e] border-2 border-black font-bold h-[28px]"
                          >
                            {downloadingInvoiceId === invoice.actualOrderId ? (
                              <>
                                <div className="inline-block w-3 h-3 border-2 border-[#1a1a3e] border-t-transparent rounded-full animate-spin mr-1" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <span className="font-bold text-[#1a1a3e]">Customer: {invoice.customer}</span>
                        <span className="font-bold text-[#5b3a8f]">Total: ${invoice.total.toFixed(2)}</span>
                        <span className="text-[#6c757d]">Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Review Moderation</h2>
                <p className="text-[#6c757d]">Stay on top of approvals before comments go live</p>
              </div>
              <Link href="/admin/reviews">
                <Button className="bg-[#1a1a3e] text-white border-4 border-black font-bold">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  OPEN REVIEW PANEL
                </Button>
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#f8f9fa] border-2 border-black p-4">
                <p className="text-sm text-[#6c757d] mb-2">Pending approvals</p>
                <p className="text-3xl font-bold text-[#1a1a3e]">3 reviews</p>
                <p className="text-sm text-[#6c757d]">
                  Pull data from `/api/reviews/pending` and show quick insights in this card.
                </p>
              </div>
              <div className="bg-[#fff3cd] border-2 border-dashed border-black p-4 text-sm text-[#856404]">
                Reminder: Only product managers can approve/disapprove reviews (requirement #12). The standalone moderation UI
                already exists at `/admin/reviews`; this dashboard surfaces its metrics for quick navigation.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

