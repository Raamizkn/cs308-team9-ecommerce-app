"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Send, User, Paperclip, Image, FileText, X as XIcon, ShoppingCart, Heart, Package, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function AdminChatPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [customerContext, setCustomerContext] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

      router.push("/")
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

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages()
      fetchCustomerContext()
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
      // Get all unique user_ids from chat messages
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("user_id, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[Group9] Error fetching conversations:", error)
        return
      }

      // Get unique user_ids
      const uniqueUserIds: string[] = Array.from(new Set(messages?.map((m: any) => m.user_id as string) || [])) as string[]

      // Fetch user info for each unique user_id
      const conversationsWithInfo = await Promise.all(
        uniqueUserIds.map(async (userId: string) => {
          // Check if it's a UUID (logged-in user) or guest
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, uid")
              .eq("uid", userId)
              .maybeSingle()

            // Fetch email from API
            let userEmail = null
            try {
              const response = await fetch(`/api/admin/user-email?user_id=${userId}`)
              if (response.ok) {
                const data = await response.json()
                userEmail = data.email
              }
            } catch (error) {
              console.error("[Group9] Error fetching email for conversation:", error)
            }

            return {
              user_id: userId,
              users: {
                name: profile?.name || "User",
                email: userEmail,
              },
            }
          } else {
            // Guest user
            return {
              user_id: userId,
              users: {
                name: "Guest User",
                email: null,
              },
            }
          }
        })
      )

      setConversations(conversationsWithInfo)
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

  const fetchCustomerContext = async () => {
    if (!selectedUser || selectedUser.startsWith('guest_')) {
      setCustomerContext({ isGuest: true })
      return
    }

    setLoadingContext(true)
    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch customer profile (profiles table uses 'uid' not 'id')
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", selectedUser)
        .maybeSingle()

      if (profileError) {
        console.error("[Group9] Error fetching profile:", profileError)
      }

      // Fetch email from auth.users using Admin API
      let userEmail = null
      try {
        const response = await fetch(`/api/admin/user-email?user_id=${selectedUser}`)
        if (response.ok) {
          const data = await response.json()
          userEmail = data.email
        }
      } catch (error) {
        console.error("[Group9] Error fetching user email:", error)
      }

      // Fetch customer context using admin API (bypasses RLS)
      let orders: any[] = []
      let cartItems: any[] = []
      let formattedWishlist: any[] = []

      try {
        const contextResponse = await fetch(`/api/admin/customer-context?user_id=${selectedUser}`)
        if (contextResponse.ok) {
          const contextData = await contextResponse.json()
          orders = contextData.orders || []
          cartItems = contextData.cart || []
          formattedWishlist = contextData.wishlist || []
        } else {
          console.error("[Group9] Error fetching customer context:", await contextResponse.text())
        }
      } catch (error) {
        console.error("[Group9] Error fetching customer context:", error)
      }

      setCustomerContext({
        isGuest: false,
        profile: profile ? { ...profile, email: userEmail } : null,
        orders: orders || [],
        cart: cartItems || [],
        wishlist: formattedWishlist || [],
      })
    } catch (error) {
      console.error("[Group9] Error fetching customer context:", error)
      setCustomerContext({ isGuest: false, error: true })
    } finally {
      setLoadingContext(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        })
        return false
      }
      return true
    })
    setAttachments([...attachments, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (attachments.length === 0) return []

    setUploading(true)
    try {
      // Convert files to data URLs for immediate display (especially images)
      const filePromises = attachments.map(async (file) => {
        // For images, create a data URL so they can be displayed immediately
        if (file.type && file.type.startsWith('image/')) {
          return new Promise<{ name: string; type: string; size: number; url: string }>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                url: e.target?.result as string, // data:image/png;base64,...
              })
            }
            reader.onerror = () => {
              // Fallback to blob URL if FileReader fails
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                url: URL.createObjectURL(file),
              })
            }
            reader.readAsDataURL(file)
          })
        } else {
          // For non-images, create a blob URL for download
          return {
        name: file.name,
        type: file.type,
        size: file.size,
            url: URL.createObjectURL(file), // blob:http://...
          }
        }
      })

      return await Promise.all(filePromises)
    } catch (error) {
      console.error("[Group9] Error uploading files:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload files",
        variant: "destructive",
      })
      return []
    } finally {
      setUploading(false)
    }
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedUser) return

    setLoading(true)
    try {
      const uploadedFiles = await uploadFiles()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser,
          message: newMessage.trim() || "(Attachment)",
          is_support: true,
          attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
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
      setAttachments([])
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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const selectedConversation = conversations.find((c) => c.user_id === selectedUser)

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">LIVE CHAT</h1>
          <p className="text-[#6c757d] font-semibold">{conversations.length} active conversations</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black font-bold"
          >
            <LogOut className="h-4 w-4 mr-2" />
            LOGOUT
          </Button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-3">
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
          <div className="lg:col-span-5">
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
                        
                        {/* Attachments Display */}
                        {(() => {
                          let attachmentsArray = msg.attachments
                          // Handle JSONB - might be string or already parsed
                          if (typeof attachmentsArray === 'string') {
                            try {
                              attachmentsArray = JSON.parse(attachmentsArray)
                            } catch (e) {
                              attachmentsArray = null
                            }
                          }
                          return attachmentsArray && Array.isArray(attachmentsArray) && attachmentsArray.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {attachmentsArray.map((file: any, idx: number) => {
                                const isImage = file.type && file.type.startsWith('image/')
                                const hasValidUrl = file.url && (file.url.startsWith('data:') || file.url.startsWith('blob:') || file.url.startsWith('http'))
                                
                                const handleDownload = async () => {
                                  if (!file.url || file.url.startsWith('mock://')) {
                                    toast({
                                      title: "Download unavailable",
                                      description: "File was not uploaded to storage. Download not available for this attachment.",
                                      variant: "destructive",
                                    })
                                    return
                                  }

                                  try {
                                    let blob: Blob
                                    let downloadUrl: string

                                    if (file.url.startsWith('data:')) {
                                      // Convert data URL to blob
                                      const response = await fetch(file.url)
                                      blob = await response.blob()
                                      downloadUrl = URL.createObjectURL(blob)
                                    } else if (file.url.startsWith('blob:')) {
                                      // For blob URLs, fetch and create new blob
                                      const response = await fetch(file.url)
                                      blob = await response.blob()
                                      downloadUrl = URL.createObjectURL(blob)
                                    } else {
                                      // For HTTP URLs, use directly
                                      downloadUrl = file.url
                                    }

                                    const link = document.createElement('a')
                                    link.href = downloadUrl
                                    link.download = file.name || 'attachment'
                                    link.target = '_blank'
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)

                                    // Clean up blob URL if we created one
                                    if (downloadUrl.startsWith('blob:')) {
                                      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100)
                                    }
                                  } catch (error) {
                                    console.error("[Group9] Error downloading file:", error)
                                    toast({
                                      title: "Download failed",
                                      description: "Failed to download file. Please try again.",
                                      variant: "destructive",
                                    })
                                  }
                                }
                                
                                return (
                                  <div key={idx} className="space-y-1">
                                    {isImage && hasValidUrl ? (
                                      // Display image preview with download option
                                      <div 
                                        className="border-2 border-black relative group cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleDownload()
                                        }}
                                      >
                                        <img
                                          src={file.url}
                                          alt={file.name || 'Attachment'}
                                          className="max-w-full h-auto max-h-64 object-contain bg-[#f8f9fa] pointer-events-none select-none"
                                          title="Click to download"
                                          draggable={false}
                                          onError={(e) => {
                                            // Fallback to file display if image fails to load
                                            const target = e.target as HTMLImageElement
                                            target.style.display = 'none'
                                            const fallback = target.nextElementSibling as HTMLElement
                                            if (fallback) fallback.style.display = 'flex'
                                          }}
                                        />
                                        <div className="hidden flex items-center gap-2 p-2 bg-white/50 border-t-2 border-black text-xs">
                                          {getFileIcon(file.type)}
                                          <span className="truncate flex-1">{file.name}</span>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              handleDownload()
                                            }}
                                            className="text-[#5b3a8f] hover:underline"
                                            title="Download"
                                          >
                                            Download
                                          </button>
                                          <span className="text-[#6c757d]">{file.size ? (file.size / 1024).toFixed(1) + 'KB' : ''}</span>
                                        </div>
                                        {/* Download overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 border-2 border-white">
                                            Click to Download
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      // Display file info for non-images with download button
                                      <div className="flex items-center gap-2 p-2 bg-white/50 border border-black text-xs">
                                {getFileIcon(file.type)}
                                <span className="truncate flex-1">{file.name}</span>
                                    {file.url ? (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleDownload()
                                        }}
                                        className="text-[#5b3a8f] hover:underline font-semibold"
                                        title="Download file"
                                      >
                                        Download
                                      </button>
                                    ) : null}
                                        <span className="text-[#6c757d]">{file.size ? (file.size / 1024).toFixed(1) + 'KB' : ''}</span>
                          </div>
                        )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : null
                        })()}

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
                <div className="border-t-4 border-black p-4 bg-white space-y-2">
                  {/* Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-[#f8f9fa] border-2 border-black text-xs">
                          {getFileIcon(file.type)}
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-[#6c757d]">{(file.size / 1024).toFixed(1)}KB</span>
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="text-[#dc3545] hover:text-[#c82333]"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading}
                      className="bg-white hover:bg-[#e9ecef] text-black border-4 border-black font-bold flex-shrink-0"
                      title="Attach files (images, PDFs, documents)"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      className="border-4 border-black"
                      disabled={loading || uploading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || uploading || (!newMessage.trim() && attachments.length === 0)}
                      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold flex-shrink-0"
                    >
                      {uploading ? "..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-[#6c757d] px-1">
                    Attach images, PDFs, or documents (max 10MB each)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Context Sidebar */}
          {selectedUser && (
            <div className="lg:col-span-4">
              <div className="bg-white border-4 border-black pixel-shadow-sm sticky top-4">
                <div className="bg-[#4ecdc4] border-b-4 border-black p-4">
                  <h2 className="font-bold text-[#1a1a3e]">CUSTOMER INFO</h2>
                </div>
                
                {loadingContext ? (
                  <div className="p-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
                  </div>
                ) : customerContext?.isGuest ? (
                  <div className="p-4 space-y-4">
                    <div className="bg-[#fff3cd] border-2 border-black p-4">
                      <p className="text-sm font-semibold text-[#856404]">👤 Guest User</p>
                      <p className="text-xs text-[#856404] mt-1">Not logged in - limited information available</p>
                    </div>
                  </div>
                ) : customerContext?.error ? (
                  <div className="p-4">
                    <div className="bg-[#f8d7da] border-2 border-black p-4">
                      <p className="text-sm font-semibold text-[#721c24]">Error loading customer data</p>
                    </div>
                  </div>
                ) : customerContext ? (
                  <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Profile */}
                    {customerContext.profile && (
                      <div className="border-2 border-black p-3 bg-[#f8f9fa]">
                        <h3 className="font-bold text-[#1a1a3e] text-sm mb-2">📋 PROFILE</h3>
                        <div className="space-y-1 text-xs">
                          <p><span className="font-semibold">Name:</span> {customerContext.profile.name}</p>
                          <p><span className="font-semibold">Email:</span> {customerContext.profile.email}</p>
                          {customerContext.profile.home_address && (
                            <p><span className="font-semibold">Address:</span> {customerContext.profile.home_address}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Orders */}
                    <div className="border-2 border-black p-3 bg-[#f8f9fa]">
                      <h3 className="font-bold text-[#1a1a3e] text-sm mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        RECENT ORDERS ({customerContext.orders?.length || 0})
                      </h3>
                      {customerContext.orders?.length > 0 ? (
                        <div className="space-y-2">
                          {customerContext.orders.map((order: any) => (
                            <div key={order.id} className="bg-white border border-black p-2 text-xs">
                              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                              <p className="text-[#6c757d]">
                                <span className={`px-2 py-0.5 border border-black ${
                                  order.status === 'delivered' ? 'bg-[#6bcf7f]' :
                                  order.status === 'shipped' ? 'bg-[#4ecdc4]' :
                                  order.status === 'processing' ? 'bg-[#ffb347]' : 'bg-[#dc3545] text-white'
                                }`}>
                                  {order.status}
                                </span>
                              </p>
                              <p className="font-bold mt-1">${order.total_amount}</p>
                              <p className="text-[#6c757d]">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6c757d]">No orders yet</p>
                      )}
                    </div>

                    {/* Cart Items */}
                    <div className="border-2 border-black p-3 bg-[#f8f9fa]">
                      <h3 className="font-bold text-[#1a1a3e] text-sm mb-2 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        CART ({customerContext.cart?.length || 0})
                      </h3>
                      {customerContext.cart?.length > 0 ? (
                        <div className="space-y-2">
                          {customerContext.cart.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white border border-black p-2 text-xs flex gap-2">
                              <div className="flex-1">
                                <p className="font-semibold">{item.products?.name}</p>
                                <p className="text-[#6c757d]">Qty: {item.quantity}</p>
                                <p className="font-bold">${item.products?.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6c757d]">Cart is empty</p>
                      )}
                    </div>

                    {/* Wishlist */}
                    <div className="border-2 border-black p-3 bg-[#f8f9fa]">
                      <h3 className="font-bold text-[#1a1a3e] text-sm mb-2 flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        WISHLIST ({customerContext.wishlist?.length || 0})
                      </h3>
                      {customerContext.wishlist?.length > 0 ? (
                        <div className="space-y-2">
                          {customerContext.wishlist.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="bg-white border border-black p-2 text-xs">
                              <p className="font-semibold truncate">{item.products?.name}</p>
                              <p className="font-bold">${item.products?.price}</p>
                            </div>
                          ))}
                          {customerContext.wishlist.length > 5 && (
                            <p className="text-xs text-[#6c757d] text-center">+{customerContext.wishlist.length - 5} more</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6c757d]">Wishlist is empty</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
