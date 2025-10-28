"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Send, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminChatPage() {
  const { toast } = useToast()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("chat_messages")
        .select("user_id, users(name, email)")
        .order("created_at", { ascending: false })

      // Get unique users
      const uniqueUsers = Array.from(new Map(data?.map((item) => [item.user_id, item])).values())
      setConversations(uniqueUsers)
    } catch (error) {
      console.error("[Group9] Error fetching conversations:", error)
    }
  }

  const fetchMessages = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/chat?user_id=${selectedUser}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("[Group9] Error fetching messages:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return

    setLoading(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser,
          message: newMessage,
          is_support: true,
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

  const selectedConversation = conversations.find((c) => c.user_id === selectedUser)

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
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">LIVE CHAT</h1>
          <p className="text-[#6c757d] font-semibold">{conversations.length} active conversations</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black pixel-shadow-sm">
              <div className="bg-[#5b3a8f] border-b-4 border-black p-4">
                <h2 className="font-bold text-white">CONVERSATIONS</h2>
              </div>
              <div className="divide-y-4 divide-[#e9ecef]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#6c757d] font-semibold">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.user_id}
                      onClick={() => setSelectedUser(conv.user_id)}
                      className={`w-full p-4 text-left hover:bg-[#f8f9fa] transition-colors ${
                        selectedUser === conv.user_id ? "bg-[#4ecdc4]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5b3a8f] border-2 border-black flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1a1a3e] truncate">{conv.users?.name || "User"}</p>
                          <p className="text-xs text-[#6c757d] truncate">{conv.users?.email}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2">
            <div className="bg-white border-4 border-black pixel-shadow-sm h-[600px] flex flex-col">
              {/* Header */}
              <div className="bg-[#5b3a8f] border-b-4 border-black p-4">
                {selectedConversation ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#4ecdc4] border-2 border-black flex items-center justify-center">
                      <User className="h-5 w-5 text-[#1a1a3e]" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{selectedConversation.users?.name || "User"}</p>
                      <p className="text-xs text-[#ffb347]">{selectedConversation.users?.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-bold text-white">Select a conversation</p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
                {!selectedUser ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#6c757d] font-semibold">Select a conversation to start chatting</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#6c757d] font-semibold">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_support ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-3 border-2 border-black ${
                          msg.is_support ? "bg-[#4ecdc4]" : "bg-white"
                        }`}
                      >
                        {!msg.is_support && (
                          <p className="text-xs font-bold text-[#5b3a8f] mb-1">{msg.users?.name || "User"}</p>
                        )}
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
              {selectedUser && (
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
