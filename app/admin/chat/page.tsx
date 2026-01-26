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
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [customerContext, setCustomerContext] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "unclaimed" | "claimed" | "my_claims">("all")
  const [isNearBottom, setIsNearBottom] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
    // Get current agent ID
    const getCurrentAgentId = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentAgentId(user.id)
      }
    }
    getCurrentAgentId()
    
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [filter])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages()
      fetchCustomerContext()
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedUser])

  useEffect(() => {
    // Update selectedConversation when selectedUser changes
    if (selectedUser) {
      const conv = conversations.find((c: any) => c.user_id === selectedUser)
      setSelectedConversation(conv || null)
    } else {
      setSelectedConversation(null)
    }
  }, [selectedUser, conversations])

  // Auto-scroll disabled - user can manually scroll to see new messages
  // useEffect(() => {
  //   // Only auto-scroll if user is near bottom
  //   if (isNearBottom) {
  //   scrollToBottom()
  //   }
  // }, [messages, isNearBottom])

  // Scroll detection disabled - auto-scroll is disabled
  // useEffect(() => {
  //   const container = messagesContainerRef.current
  //   if (!container) return

  //   const handleScroll = () => {
  //     const { scrollTop, scrollHeight, clientHeight } = container
  //     // Consider "near bottom" if within 100px of bottom
  //     const threshold = 100
  //     const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold
  //     setIsNearBottom(isAtBottom)
  //   }

  //   container.addEventListener('scroll', handleScroll)
  //   // Check initial position
  //   handleScroll()

  //   return () => {
  //     container.removeEventListener('scroll', handleScroll)
  //   }
  // }, [selectedUser]) // Re-check when conversation changes

  const fetchConversations = async () => {
    try {
      // Use the new API endpoint that includes claim status
      const response = await fetch(`/api/admin/chat/conversations?filter=${filter}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch conversations" }))
        throw new Error(errorData.error || "Failed to fetch conversations")
      }
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error("[Group9] Error fetching conversations:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load conversations",
        variant: "destructive",
      })
    }
  }

  const handleClaim = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/chat/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to claim conversation")
      }

      toast({
        title: "Success",
        description: "Conversation claimed successfully",
      })

      // Refresh conversations
      fetchConversations()

      // If this was the selected user, refresh to show updated claim status
      if (selectedUser === userId) {
        fetchConversations()
      }
    } catch (error) {
      console.error("[Group9] Error claiming conversation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to claim conversation",
        variant: "destructive",
      })
    }
  }

  const handleUnclaim = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/chat/unclaim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to unclaim conversation")
      }

      toast({
        title: "Success",
        description: "Conversation released successfully",
      })

      // Refresh conversations
      fetchConversations()

      // If this was the selected user, refresh to show updated claim status
      if (selectedUser === userId) {
        fetchConversations()
      }
    } catch (error) {
      console.error("[Group9] Error unclaiming conversation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to release conversation",
        variant: "destructive",
      })
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
      // Convert ALL files to data URLs so they persist in the database
      // Blob URLs expire when the page refreshes, but data URLs persist
      const filePromises = attachments.map(async (file) => {
        return new Promise<{ name: string; type: string; size: number; url: string }>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve({
        name: file.name,
        type: file.type,
        size: file.size,
              url: e.target?.result as string, // data:image/png;base64,... or data:application/pdf;base64,...
            })
          }
          reader.onerror = () => {
            // If FileReader fails, reject the promise
            reject(new Error(`Failed to read file: ${file.name}`))
          }
          reader.readAsDataURL(file)
        })
      })

      // Use Promise.allSettled to handle individual file failures
      const results = await Promise.allSettled(filePromises)
      const successfulFiles = results
        .filter((result): result is PromiseFulfilledResult<{ name: string; type: string; size: number; url: string }> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)
      
      const failedFiles = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason?.message || 'Unknown error')

      if (failedFiles.length > 0) {
        console.error("[Group9] Some files failed to upload:", failedFiles)
        if (successfulFiles.length === 0) {
          toast({
            title: "Upload failed",
            description: "Failed to process files. Please try again.",
            variant: "destructive",
          })
          return []
        } else {
          toast({
            title: "Partial upload",
            description: `${failedFiles.length} file(s) failed to upload, but ${successfulFiles.length} file(s) were processed.`,
            variant: "default",
          })
        }
      }

      return successfulFiles
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

    // Check if conversation is claimed by current agent or unclaimed
    const conv = conversations.find((c: any) => c.user_id === selectedUser)
    if (conv?.claimed_by && conv.claimed_by !== currentAgentId) {
      toast({
        title: "Cannot send message",
        description: "This conversation is claimed by another agent. Please claim it first or select a different conversation.",
        variant: "destructive",
      })
      return
    }

    // Auto-claim if unclaimed
    if (conv && !conv.claimed_by) {
      await handleClaim(selectedUser)
    }

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
      // Auto-scroll disabled - user can manually scroll if needed
      // setTimeout(() => scrollToBottom(true), 100)
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

  const scrollToBottom = (force = false) => {
    if (force || isNearBottom) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">LIVE CHAT</h1>
            <p className="text-[#6c757d] font-semibold">
              {conversations.filter((c: any) => !c.claimed_by).length} unclaimed • {conversations.filter((c: any) => c.claimed_by === currentAgentId).length} my claims • {conversations.length} total
            </p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black font-bold"
          >
            <LogOut className="h-4 w-4 mr-2" />
            LOGOUT
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2">
          <Button
            onClick={() => setFilter("all")}
            className={`border-4 border-black font-bold ${
              filter === "all" ? "bg-[#4ecdc4] text-[#1a1a3e]" : "bg-white text-[#1a1a3e]"
            }`}
          >
            ALL
          </Button>
          <Button
            onClick={() => setFilter("unclaimed")}
            className={`border-4 border-black font-bold ${
              filter === "unclaimed" ? "bg-[#ffb347] text-[#1a1a3e]" : "bg-white text-[#1a1a3e]"
            }`}
          >
            QUEUE ({conversations.filter((c: any) => !c.claimed_by).length})
          </Button>
          <Button
            onClick={() => setFilter("my_claims")}
            className={`border-4 border-black font-bold ${
              filter === "my_claims" ? "bg-[#6bcf7f] text-[#1a1a3e]" : "bg-white text-[#1a1a3e]"
            }`}
          >
            MY CLAIMS ({conversations.filter((c: any) => c.claimed_by === currentAgentId).length})
            </Button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-3">
            <div className="bg-white border-4 border-black pixel-shadow-sm">
              <div className="bg-[#5b3a8f] border-b-4 border-black p-4">
                <h2 className="font-bold text-white">
                  {filter === "unclaimed" ? "QUEUE" : filter === "my_claims" ? "MY CLAIMS" : "CONVERSATIONS"}
                </h2>
              </div>
              <div className="divide-y-4 divide-[#e9ecef] max-h-[600px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#6c757d] font-semibold">
                      {filter === "unclaimed" ? "No unclaimed conversations" : 
                       filter === "my_claims" ? "You haven't claimed any conversations" : 
                       "No conversations yet"}
                    </p>
                  </div>
                ) : (
                  conversations.map((conv: any) => {
                    const isClaimed = !!conv.claimed_by
                    const isMyClaim = conv.claimed_by === currentAgentId
                    const isSelected = selectedUser === conv.user_id

                    return (
                      <div
                        key={conv.user_id}
                        className={`w-full border-b-4 border-[#e9ecef] last:border-b-0 ${
                          isSelected ? "bg-[#4ecdc4]" : "bg-white"
                        }`}
                      >
                    <button
                      onClick={() => setSelectedUser(conv.user_id)}
                      className={`w-full p-4 text-left hover:bg-[#f8f9fa] transition-colors ${
                            isSelected ? "bg-[#4ecdc4]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 border-2 border-black flex items-center justify-center flex-shrink-0 ${
                              isClaimed ? (isMyClaim ? "bg-[#6bcf7f]" : "bg-[#ffb347]") : "bg-[#5b3a8f]"
                            }`}>
                              <User className={`h-5 w-5 ${isClaimed ? "text-[#1a1a3e]" : "text-white"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1a1a3e] truncate">{conv.users?.name || "User"}</p>
                              <p className="text-xs text-[#6c757d] truncate">{conv.users?.email || "No email"}</p>
                              {isClaimed && (
                                <p className="text-xs mt-1">
                                  {isMyClaim ? (
                                    <span className="text-[#6bcf7f] font-semibold">✓ Claimed by you</span>
                                  ) : (
                                    <span className="text-[#ffb347] font-semibold">Claimed by {conv.agent?.name || "another agent"}</span>
                                  )}
                                </p>
                              )}
                              {!isClaimed && (
                                <p className="text-xs mt-1 text-[#dc3545] font-semibold">⚠ Unclaimed</p>
                              )}
                            </div>
                          </div>
                        </button>
                        {/* Claim/Unclaim Button */}
                        <div className="px-4 pb-3">
                          {!isClaimed ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClaim(conv.user_id)
                              }}
                              className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-2 border-black font-bold text-xs py-1"
                            >
                              CLAIM
                            </Button>
                          ) : isMyClaim ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnclaim(conv.user_id)
                              }}
                              className="w-full bg-[#dc3545] hover:bg-[#c82333] text-white border-2 border-black font-bold text-xs py-1"
                            >
                              RELEASE
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
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
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
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
                                    let downloadUrl: string
                                    let shouldRevoke = false

                                    if (file.url.startsWith('data:')) {
                                      // Convert data URL to blob URL for download
                                      const response = await fetch(file.url)
                                      const blob = await response.blob()
                                      downloadUrl = URL.createObjectURL(blob)
                                      shouldRevoke = true
                                    } else if (file.url.startsWith('blob:')) {
                                      // Blob URLs can be used directly - they're already valid URLs
                                      // However, if they're expired (from database), we need to handle that
                                      downloadUrl = file.url
                                      // Don't revoke - it might be managed elsewhere
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
                                    if (shouldRevoke && downloadUrl.startsWith('blob:')) {
                                      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100)
                                    }
                                  } catch (error) {
                                    console.error("[Group9] Error downloading file:", error)
                                    toast({
                                      title: "Download failed",
                                      description: "Failed to download file. The file may have expired or is no longer available.",
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
                              <p className="font-bold mt-1">${order.total || order.total_amount || 0}</p>
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
