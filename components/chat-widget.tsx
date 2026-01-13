"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, X, Send, Paperclip, Image, FileText, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function ChatWidget({ initialOpen = false }: { initialOpen?: boolean }) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
    checkIfSupportAgent()
  }, [])

  const [isSupportAgent, setIsSupportAgent] = useState(false)

  const checkIfSupportAgent = async () => {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (user?.id) {
      const { data } = await supabase
        .from("support_agents")
        .select("uid")
        .eq("uid", user.id)
        .maybeSingle()
      setIsSupportAgent(!!data)
    }
  }

  useEffect(() => {
    if (initialOpen) setIsOpen(true)
  }, [initialOpen])

  useEffect(() => {
    if (isOpen && (userId || sessionId)) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen, userId, sessionId])

  useEffect(() => {
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
    scrollToBottom()
    }
  }, [messages, isNearBottom])

  // Detect scroll position
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Consider "near bottom" if within 100px of bottom
      const threshold = 100
      const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold
      setIsNearBottom(isAtBottom)
    }

    container.addEventListener('scroll', handleScroll)
    // Check initial position
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [isOpen, userId, sessionId]) // Re-check when chat opens or user changes

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
      // Force scroll when sending your own message
      setTimeout(() => scrollToBottom(true), 100)
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

  // Don't show chat widget for support agents (they have their own interface)
  if (isSupportAgent) {
    return null
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
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
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
