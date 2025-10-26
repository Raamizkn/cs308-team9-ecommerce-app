"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SupportDashboardPage() {
  const { toast } = useToast()
  const [refundRequests, setRefundRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRefundRequests()
  }, [])

  const fetchRefundRequests = async () => {
    try {
      const response = await fetch("/api/refunds")
      const data = await response.json()
      setRefundRequests(data.refund_requests || [])
    } catch (error) {
      console.error("[Group9] Error fetching refund requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefundAction = async (refundId: string, action: "approved" | "rejected") => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("refund_requests").update({ status: action }).eq("id", refundId)

      if (error) {
        toast({
          title: "Action failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: `Refund ${action}`,
        description: `The refund request has been ${action}`,
      })

      fetchRefundRequests()
    } catch (error) {
      console.error("[Group9] Error updating refund:", error)
    }
  }

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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">CUSTOMER SUPPORT</h1>
          <p className="text-[#6c757d] font-semibold">{refundRequests.length} refund requests</p>
        </div>

        <div className="space-y-6">
          {refundRequests.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
              <p className="text-2xl font-bold text-[#6c757d]">No refund requests</p>
            </div>
          ) : (
            refundRequests.map((request) => (
              <div key={request.id} className="bg-white border-4 border-black p-6 pixel-shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-xl text-[#1a1a3e] mb-1">
                      Order #{request.order_id?.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-[#6c757d]">
                      Requested on{" "}
                      {new Date(request.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 border-2 border-black font-bold text-sm ${
                      request.status === "approved"
                        ? "bg-[#6bcf7f]"
                        : request.status === "rejected"
                          ? "bg-[#dc3545] text-white"
                          : "bg-[#ffb347]"
                    }`}
                  >
                    {request.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-[#f8f9fa] border-4 border-black p-4 mb-4">
                  <p className="text-sm font-bold text-[#1a1a3e] mb-2">REASON:</p>
                  <p className="text-[#6c757d] leading-relaxed">{request.reason}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-[#6c757d]">
                      Order Total: <span className="font-bold text-[#5b3a8f]">${request.orders?.total.toFixed(2)}</span>
                    </p>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleRefundAction(request.id, "approved")}
                        className="bg-[#6bcf7f] hover:bg-[#5ab86f] text-black border-4 border-black font-bold"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        APPROVE
                      </Button>
                      <Button
                        onClick={() => handleRefundAction(request.id, "rejected")}
                        className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black font-bold"
                      >
                        <X className="h-4 w-4 mr-2" />
                        REJECT
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
