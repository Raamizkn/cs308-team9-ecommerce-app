"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, FileText, Download, Printer, Search, Calendar } from "lucide-react"

interface Invoice {
  order_id: number | string
  customer_name: string
  customer_email: string
  order_date: string
  total_amount: number
  order_status: string
  items: InvoiceItem[]
  subtotal?: number
  tax_amount?: number
  shipping_address?: string
  payment_method?: string
}

interface InvoiceItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
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
    } catch (error) {
      console.error("[Group9] Error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setFetching(true)
    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch orders within date range
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          subtotal,
          tax_amount,
          status,
          shipping_address,
          payment_method,
          user_id
        `)
        .gte("created_at", new Date(startDate).toISOString())
        .lte("created_at", new Date(endDate + "T23:59:59").toISOString())
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("[Group9] Error fetching orders:", ordersError)
        throw ordersError
      }

      // Fetch customer profiles for all orders with user_id
      const userIds = [...new Set((ordersData || [])
        .filter((o: any) => o.user_id)
        .map((o: any) => o.user_id))]
      
      let profilesMap: Record<string, { name: string; email: string }> = {}
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", userIds)
        
        if (profilesData) {
          // Initialize with names
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = { name: profile.name || "Unknown Customer", email: "No Email" }
          })
          
          // Fetch emails for all users using admin API
          const emailPromises = userIds.map(async (userId) => {
            try {
              const response = await fetch(`/api/admin/user-email?user_id=${userId}`)
              if (response.ok) {
                const data = await response.json()
                if (profilesMap[userId]) {
                  profilesMap[userId].email = data.email || "No Email"
                }
              }
            } catch (error) {
              console.error(`[Group9] Error fetching email for ${userId}:`, error)
            }
          })
          
          await Promise.all(emailPromises)
        }
      }

      // For each order, fetch order items
      const invoicesWithItems = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { data: itemsData } = await supabase
            .from("order_items")
            .select(`
              quantity,
              price,
              products_belong_to (
                name
              )
            `)
            .eq("order_id", order.id)

          const items: InvoiceItem[] = (itemsData || []).map((item: any) => ({
            product_name: item.products_belong_to?.name || "Unknown Product",
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price,
          }))

          // Get customer data from profiles map
          const customerName = profilesMap[order.user_id]?.name || "Unknown Customer"
          const customerEmail = profilesMap[order.user_id]?.email || "No Email"
          
          // Calculate subtotal from items if not available
          const subtotal = order.subtotal || items.reduce((sum, item) => sum + item.total_price, 0)
          const tax = order.tax_amount || (order.total - subtotal)

          return {
            order_id: order.id,
            customer_name: customerName,
            customer_email: customerEmail,
            order_date: order.created_at,
            total_amount: order.total,
            order_status: order.status,
            items,
            subtotal,
            tax_amount: tax,
            shipping_address: order.shipping_address || "N/A",
            payment_method: order.payment_method || "Credit Card",
          }
        })
      )

      setInvoices(invoicesWithItems)

      if (invoicesWithItems.length === 0) {
        toast({
          title: "No invoices found",
          description: "No orders found in the selected date range",
        })
      }
    } catch (error) {
      console.error("[Group9] Error fetching invoices:", error)
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to print invoices",
        variant: "destructive",
      })
      return
    }

    const html = generateInvoiceHTML(invoice)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const downloadAsPDF = (invoice: Invoice) => {
    // Create a hidden iframe for printing to PDF
    const iframe = document.createElement("iframe")
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(generateInvoiceHTML(invoice))
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)

    toast({
      title: "Opening print dialog",
      description: "Select 'Save as PDF' in the print dialog",
    })
  }

  const generateInvoiceHTML = (invoice: Invoice) => {
    const orderDate = new Date(invoice.order_date)
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    
    // Use subtotal and tax from invoice, or calculate from items
    const subtotal = invoice.subtotal || invoice.items.reduce((sum, item) => sum + item.total_price, 0)
    const tax = invoice.tax_amount || (invoice.total_amount - subtotal)
    const taxPercent = subtotal > 0 ? ((tax / subtotal) * 100).toFixed(0) : '0'
    const shipping = 0 // No shipping cost
    const invoiceId = typeof invoice.order_id === 'string' ? invoice.order_id.substring(0, 8).toUpperCase() : invoice.order_id.toString().substring(0, 8).toUpperCase()
    const shippingAddress = invoice.shipping_address || "N/A"
    const paymentMethod = invoice.payment_method || "Credit Card"
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoiceId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Helvetica', Arial, sans-serif;
              background: #ffffff;
              color: #1a1a3e;
              padding: 40px;
              font-size: 10px;
              line-height: 1.4;
            }
            .header {
              margin-bottom: 30px;
              border-bottom: 4px solid #1a1a3e;
              padding-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .logo-section { flex: 1; }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #1a1a3e;
              margin-bottom: 5px;
            }
            .tagline {
              font-size: 10px;
              color: #5b3a8f;
              font-weight: bold;
            }
            .invoice-info-section { text-align: right; }
            .invoice-number {
              font-weight: bold;
              font-size: 10px;
              color: #1a1a3e;
              margin-bottom: 4px;
            }
            .invoice-date {
              font-size: 10px;
              color: #1a1a3e;
              margin-bottom: 8px;
            }
            .status-badge {
              background: #6bcf7f;
              padding: 5px;
              border-radius: 3px;
              display: inline-block;
            }
            .status-text {
              font-size: 9px;
              font-weight: bold;
              color: #1a1a3e;
              text-align: center;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              gap: 20px;
            }
            .column { flex: 1; }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              color: #5b3a8f;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .text {
              font-size: 10px;
              color: #1a1a3e;
              margin-bottom: 4px;
            }
            .text-bold {
              font-size: 10px;
              font-weight: bold;
              color: #1a1a3e;
              margin-bottom: 4px;
            }
            .table { margin-top: 20px; margin-bottom: 20px; }
            .table-header {
              background: #5b3a8f;
              padding: 10px;
              border-top-left-radius: 4px;
              border-top-right-radius: 4px;
              display: flex;
            }
            .table-header-text {
              font-size: 10px;
              font-weight: bold;
              color: #ffffff;
            }
            .col1 { width: 10%; }
            .col2 { width: 40%; }
            .col3 { width: 15%; text-align: center; }
            .col4 { width: 15%; text-align: right; }
            .col5 { width: 20%; text-align: right; }
            .table-row {
              display: flex;
              border-bottom: 1px solid #e9ecef;
              padding: 10px;
              min-height: 40px;
              align-items: center;
            }
            .table-row-alt { background: #f8f9fa; }
            .summary-box {
              margin-top: 20px;
              padding: 15px;
              background: #4ecdc4;
              border-radius: 4px;
              width: 50%;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .summary-label {
              font-size: 11px;
              font-weight: bold;
              color: #1a1a3e;
            }
            .summary-value {
              font-size: 11px;
              color: #1a1a3e;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 2px solid #1a1a3e;
            }
            .total-label {
              font-size: 14px;
              font-weight: bold;
              color: #1a1a3e;
            }
            .total-value {
              font-size: 14px;
              font-weight: bold;
              color: #1a1a3e;
            }
            .thank-you {
              margin-top: 30px;
              padding: 20px;
              background: #ffb347;
              border-radius: 4px;
              text-align: center;
            }
            .thank-you-text {
              font-size: 14px;
              font-weight: bold;
              color: #1a1a3e;
            }
            .footer {
              position: absolute;
              bottom: 40px;
              left: 40px;
              right: 40px;
              border-top: 2px solid #e9ecef;
              padding-top: 15px;
              text-align: center;
            }
            .footer-text {
              font-size: 9px;
              color: #6c757d;
              margin-bottom: 3px;
            }
            @media print {
              body { margin: 0; padding: 40px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo">◾ PIXELVAULT</div>
              <div class="tagline">Retro Gaming Store</div>
            </div>
            <div class="invoice-info-section">
              <div class="invoice-number">Invoice #${invoiceId}</div>
              <div class="invoice-date">${formattedDate}</div>
              <div class="status-badge">
                <div class="status-text">${invoice.order_status.toUpperCase()}</div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="column">
              <div class="section-title">Bill To:</div>
              <div class="text-bold">${invoice.customer_name}</div>
              <div class="text">${invoice.customer_email}</div>
            </div>
            <div class="column">
              <div class="section-title">Ship To:</div>
              <div class="text">${shippingAddress}</div>
            </div>
            <div class="column">
              <div class="section-title">Payment:</div>
              <div class="text">${paymentMethod}</div>
              <div class="text">Order Date: ${formattedDate}</div>
            </div>
          </div>
          <div class="table">
            <div class="table-header">
              <div class="table-header-text col1">#</div>
              <div class="table-header-text col2">ITEM</div>
              <div class="table-header-text col3">QTY</div>
              <div class="table-header-text col4">PRICE</div>
              <div class="table-header-text col5">TOTAL</div>
            </div>
            ${invoice.items.map((item, index) => `
              <div class="table-row ${index % 2 === 0 ? 'table-row-alt' : ''}">
                <div class="text col1">${index + 1}</div>
                <div class="text col2">${item.product_name}</div>
                <div class="text col3">${item.quantity}</div>
                <div class="text col4">$${item.unit_price.toFixed(2)}</div>
                <div class="text-bold col5">$${item.total_price.toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          <div class="summary-box">
            <div class="summary-row">
              <div class="summary-label">Subtotal:</div>
              <div class="summary-value">$${subtotal.toFixed(2)}</div>
            </div>
            ${tax > 0 ? `
              <div class="summary-row">
                <div class="summary-label">Tax (${taxPercent}%):</div>
                <div class="summary-value">$${tax.toFixed(2)}</div>
              </div>
            ` : ''}
            ${shipping > 0 ? `
              <div class="summary-row">
                <div class="summary-label">Shipping:</div>
                <div class="summary-value">$${shipping.toFixed(2)}</div>
              </div>
            ` : ''}
            <div class="total-row">
              <div class="total-label">TOTAL:</div>
              <div class="total-value">$${invoice.total_amount.toFixed(2)}</div>
            </div>
          </div>
          <div class="thank-you">
            <div class="thank-you-text">THANK YOU FOR YOUR PURCHASE!</div>
            <div class="text" style="text-align: center; margin-top: 5px;">
              Questions? Contact us at support@pixelvault.com
            </div>
          </div>
          <div class="footer">
            <div class="footer-text">PixelVault - Retro Gaming Store</div>
            <div class="footer-text">Email: support@pixelvault.com | Web: www.pixelvault.com</div>
            <div class="footer-text">This is a computer-generated invoice. No signature required.</div>
          </div>
        </body>
      </html>
    `
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-[#6bcf7f] text-[#1a1a3e]"
      case "in-transit":
        return "bg-[#ffb347] text-[#1a1a3e]"
      case "processing":
        return "bg-[#4ecdc4] text-[#1a1a3e]"
      default:
        return "bg-[#e9ecef] text-[#6c757d]"
    }
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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
            INVOICES
          </h1>
          <p className="text-[#6c757d] font-semibold">View, print, and export invoices by date range</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white border-4 border-black p-6 pixel-shadow-sm mb-8">
          <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            SELECT DATE RANGE
          </h2>
          <div className="grid md:grid-cols-3 gap-4 items-end">
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
            <Button
              onClick={fetchInvoices}
              disabled={fetching}
              className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-black border-4 border-black font-bold"
            >
              <Search className="h-4 w-4 mr-2" />
              {fetching ? "SEARCHING..." : "SEARCH INVOICES"}
            </Button>
          </div>
        </div>

        {/* Invoices List */}
        {invoices.length > 0 ? (
          <div className="space-y-6">
            {invoices.map((invoice) => (
              <div key={invoice.order_id} className="bg-white border-4 border-black pixel-shadow-sm">
                <div className="bg-[#5b3a8f] border-b-4 border-black p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-[family-name:var(--font-pixel)] text-2xl text-white">
                      INVOICE #{invoice.order_id.toString().padStart(6, "0")}
                    </h3>
                    <span
                      className={`px-3 py-1 text-xs font-bold border-2 border-black ${getStatusColor(
                        invoice.order_status
                      )}`}
                    >
                      {invoice.order_status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => printInvoice(invoice)}
                      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-2 border-black font-bold"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      PRINT
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadAsPDF(invoice)}
                      className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-2 border-black font-bold"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">CUSTOMER</div>
                      <div className="font-bold text-[#1a1a3e]">{invoice.customer_name}</div>
                      <div className="text-sm text-[#6c757d]">{invoice.customer_email}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">ORDER DATE</div>
                      <div className="font-bold text-[#1a1a3e]">{formatDate(invoice.order_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">TOTAL AMOUNT</div>
                      <div className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                        ${invoice.total_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-4">
                    <div className="text-sm font-bold text-[#1a1a3e] mb-2">ITEMS</div>
                    <div className="space-y-2">
                      {invoice.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-[#f8f9fa] border-2 border-black"
                        >
                          <div className="flex-grow">
                            <span className="font-bold">{item.product_name}</span>
                            <span className="text-sm text-[#6c757d] ml-2">
                              x{item.quantity} @ ${item.unit_price.toFixed(2)}
                            </span>
                          </div>
                          <div className="font-bold">${item.total_price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
            <FileText className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
            <p className="text-2xl font-bold text-[#6c757d] mb-4">
              {startDate && endDate ? "No invoices found" : "Select a date range"}
            </p>
            <p className="text-[#6c757d]">
              {startDate && endDate
                ? "No orders found in the selected date range"
                : "Choose your start and end dates to view invoices"}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

