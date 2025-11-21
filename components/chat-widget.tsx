"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, X, Send, Paperclip, Image, FileText, X as XIcon } from "lucide-react"
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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isOpen && (userId || sessionId)) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen, userId, sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAuth = async () => {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (user?.id) {
      setUserId(user.id)
    } else {
      // For guests, create or retrieve a session ID
      let guestId = localStorage.getItem("pixelvault-guest-chat-id")
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        localStorage.setItem("pixelvault-guest-chat-id", guestId)
      }
      setSessionId(guestId)
    }
  }

  const fetchMessages = async () => {
    const identifier = userId || sessionId
    if (!identifier) return

    try {
      const response = await fetch(`/api/chat?user_id=${identifier}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("[Group9] Error fetching messages:", error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      // Limit file size to 10MB
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
      // TODO: Connect to Supabase Storage or your backend
      // const supabase = getSupabaseBrowserClient()
      // const uploadPromises = attachments.map(async (file) => {
      //   const fileExt = file.name.split('.').pop()
      //   const fileName = `${userId}/${Date.now()}.${fileExt}`
      //   const { data, error } = await supabase.storage
      //     .from('chat-attachments')
      //     .upload(fileName, file)
      //   return data?.path
      // })
      // const urls = await Promise.all(uploadPromises)
      // return urls

      // For now, return mock URLs
      return attachments.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: `mock://uploads/${file.name}`, // Replace with real URL
      }))
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
    const identifier = userId || sessionId
    if ((!newMessage.trim() && attachments.length === 0) || !identifier) return

    setLoading(true)
    try {
      // Upload files first
      const uploadedFiles = await uploadFiles()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: identifier,
          message: newMessage.trim() || "(Attachment)",
          is_support: false,
          is_guest: !userId,
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

  // Show chat for both authenticated users and guests
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
              <div>
                <h3 className="font-bold text-white">LIVE SUPPORT</h3>
                {!userId && (
                  <p className="text-xs text-[#ffb347]">Chatting as Guest</p>
                )}
              </div>
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
                    
                    {/* Attachments Display */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((file: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-white/50 border border-black text-xs"
                          >
                            {getFileIcon(file.type)}
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-[#6c757d]">{(file.size / 1024).toFixed(1)}KB</span>
                          </div>
                        ))}
                      </div>
                    )}

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
        </div>
      )}
    </>
  )
}
