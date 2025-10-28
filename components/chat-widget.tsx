"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function ChatWidget() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isOpen && userId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAuth = async () => {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const fetchMessages = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/chat?user_id=${userId}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("[Group9] Error fetching messages:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return

    setLoading(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          message: newMessage,
          is_support: false,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast({
          title: "Failed to send",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      setNewMessage("")
      fetchMessages()
    } catch (error) {
      console.error("[Group9] Error sending message:", error)
      toast({
        title: "Failed to send",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  if (!userId) {
    return null // Don't show chat for non-authenticated users
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-[#5b3a8f] hover:bg-[#3d2660] border-4 border-black text-white flex items-center justify-center pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all z-50"
        >
          <MessageSquare className="h-8 w-8" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white border-4 border-black pixel-shadow flex flex-col z-50">
          {/* Header */}
          <div className="bg-[#5b3a8f] border-b-4 border-black p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-white" />
              <h3 className="font-bold text-white">LIVE SUPPORT</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-[#ffb347] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6c757d] font-semibold">No messages yet</p>
                <p className="text-sm text-[#6c757d]">Start a conversation with our support team</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_support ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] p-3 border-2 border-black ${msg.is_support ? "bg-white" : "bg-[#4ecdc4]"}`}
                  >
                    {msg.is_support && <p className="text-xs font-bold text-[#5b3a8f] mb-1">Support Agent</p>}
                    <p className="text-sm text-[#1a1a3e] leading-relaxed">{msg.message}</p>
                    <p className="text-xs text-[#6c757d] mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t-4 border-black p-4 bg-white">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="border-4 border-black"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !newMessage.trim()}
                className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
