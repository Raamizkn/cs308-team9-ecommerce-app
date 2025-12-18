"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Notification {
  id: string
  product_id: number
  discount_id: number
  discount_rate: number
  is_read: boolean
  created_at: string
  products_belong_to?: {
    name: string
    price: number
    image_url?: string
  }
}

export function DiscountNotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/notifications")
      
      if (!response.ok) {
        // Silently fail if table doesn't exist or other errors
        console.log("[Group9] Notifications API error (table may not exist yet):", response.status)
        return
      }
      
      const data = await response.json()

      if (data.error) {
        console.log("[Group9] Notifications error (table may not exist yet):", data.error)
        return
      }

      console.log("[Group9] Notifications received:", data.notifications)
      // Log each notification to see product data
      data.notifications?.forEach((n: Notification) => {
        console.log(`[Group9] Notification ${n.id}:`, {
          product_id: n.product_id,
          product_name: n.products_belong_to?.name,
          product_price: n.products_belong_to?.price,
        })
      })

      setNotifications(data.notifications || [])
      setUnreadCount(data.notifications?.filter((n: Notification) => !n.is_read).length || 0)
    } catch (error) {
      console.error("[Group9] Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[Group9] Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("[Group9] Error marking all as read:", error)
    }
  }

  const discountPercentage = (rate: number) => Math.round(rate * 100)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative border-4 border-black hover:bg-[#e9ecef]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ff6b9d] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-white border-4 border-black p-0" align="end">
        <div className="bg-[#5b3a8f] border-b-4 border-black p-4 flex items-center justify-between">
          <h3 className="font-bold text-white">DISCOUNT ALERTS</h3>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              className="text-xs bg-white text-black border-2 border-black font-bold px-2 py-1 h-auto"
            >
              MARK ALL READ
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-[#6c757d] mx-auto mb-2" />
              <p className="text-[#6c757d] font-semibold">No notifications</p>
            </div>
          ) : (
            <div className="divide-y-4 divide-black">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[#f8f9fa] ${
                    !notification.is_read ? "bg-[#fff3cd]" : ""
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <Link
                    href={`/?product=${notification.product_id}`}
                    className="block"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-[#ff6b9d] rounded-full border border-black" />
                          )}
                          <span className="text-xs font-bold text-[#5b3a8f]">
                            {discountPercentage(notification.discount_rate)}% OFF
                          </span>
                        </div>
                        <p className="font-bold text-sm text-[#1a1a3e] mb-1">
                          {notification.products_belong_to?.name || "Product"}
                        </p>
                        {notification.products_belong_to?.price && (
                          <p className="text-xs text-[#6c757d]">
                            Was ${notification.products_belong_to.price.toFixed(2)} • Now $
                            {(
                              notification.products_belong_to.price *
                              (1 - notification.discount_rate)
                            ).toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-[#6c757d] mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

