"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils"
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  RotateCcw,
} from "lucide-react"

type Change = {
  id: string
  title: string
  field: string
  old_value: string
  new_value: string
}

type Message = {
  id: string
  role: "user" | "agent"
  text: string
  changes?: Change[]
  suggestions?: string[]
  status?: "applied" | "no_match" | "error"
  timestamp: Date
}

const EXAMPLE_COMMANDS = [
  "Babysitter booking flow went live",
  "Wallpaper KSA config is in progress",
  "Birthday party designs are blocked",
  "Midwife design delayed to May 20",
  "GA tracking is not started",
  "Kids interior launched",
]

export default function UpdatesPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSubmit(text?: string) {
    const instruction = (text || input).trim()
    if (!instruction || processing) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: instruction,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setProcessing(true)

    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      })
      const data = await res.json()

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: "agent",
        text: data.message || data.error || "Something went wrong",
        changes: data.changes,
        suggestions: data.suggestions,
        status: data.status,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, agentMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "agent",
        text: "Failed to process update. Check your connection.",
        status: "error",
        timestamp: new Date(),
      }])
    } finally {
      setProcessing(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--mw-pink)]" />
            Quick Updates
          </h1>
          <p className="text-sm text-[var(--mw-text-secondary)] mt-1">
            Type natural language to update any service or task
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--mw-text-secondary)] border border-[var(--mw-card-border)] rounded-xl hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--mw-pink-light)] flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8 text-[var(--mw-pink)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--mw-text-primary)]">What would you like to update?</p>
              <p className="text-sm text-[var(--mw-text-secondary)] mt-1">
                Tell me in plain English what changed and I'll update the tracker
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {EXAMPLE_COMMANDS.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => handleSubmit(cmd)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-[var(--mw-card-border)] rounded-full text-[var(--mw-text-secondary)] hover:border-[var(--mw-pink)]/30 hover:text-[var(--mw-pink)] transition"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "agent" && (
              <div className="w-8 h-8 rounded-xl bg-[var(--mw-pink-light)] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[var(--mw-pink)]" />
              </div>
            )}

            <div className={cn(
              "max-w-[80%] rounded-2xl p-4 space-y-3",
              msg.role === "user"
                ? "bg-[var(--mw-navy)] text-white rounded-br-md"
                : "bg-white border border-[var(--mw-card-border)] rounded-bl-md"
            )}>
              <p className={cn(
                "text-sm",
                msg.role === "user" ? "text-white" : "text-[var(--mw-text-primary)]"
              )}>
                {msg.text}
              </p>

              {/* Show changes */}
              {msg.changes && msg.changes.length > 0 && (
                <div className="space-y-2">
                  {msg.changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--mw-bg)] text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[var(--mw-text-primary)] font-medium truncate flex-1">{change.title}</span>
                      {change.field === "status" && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Badge className={cn(getStatusColor(change.old_value), "text-[9px] px-1 py-0")}>{getStatusLabel(change.old_value)}</Badge>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <Badge className={cn(getStatusColor(change.new_value), "text-[9px] px-1 py-0")}>{getStatusLabel(change.new_value)}</Badge>
                        </span>
                      )}
                      {change.field === "eta" && (
                        <span className="text-[var(--mw-text-secondary)]">
                          ETA: {change.old_value || "none"} → <strong>{change.new_value || "none"}</strong>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Show suggestions on no match */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="space-y-1">
                  {msg.suggestions.map((s, i) => (
                    <p key={i} className="text-xs text-[var(--mw-text-secondary)]">{s}</p>
                  ))}
                </div>
              )}

              {/* Status indicator */}
              {msg.status && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  {msg.status === "applied" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  {msg.status === "no_match" && <AlertCircle className="w-3 h-3 text-amber-500" />}
                  {msg.status === "error" && <AlertCircle className="w-3 h-3 text-red-500" />}
                  <span className={cn(
                    msg.status === "applied" ? "text-emerald-600" :
                    msg.status === "no_match" ? "text-amber-600" : "text-red-600"
                  )}>
                    {msg.status === "applied" ? "Changes applied" :
                     msg.status === "no_match" ? "No matching items found" : "Error"}
                  </span>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-[var(--mw-navy)] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {processing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--mw-pink-light)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[var(--mw-pink)]" />
            </div>
            <div className="bg-white border border-[var(--mw-card-border)] rounded-2xl rounded-bl-md p-4">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--mw-text-secondary)]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--mw-card-border)] pt-4">
        <form
          onSubmit={e => { e.preventDefault(); handleSubmit() }}
          className="flex gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. Babysitter went live, Wallpaper KSA is in progress..."
            disabled={processing}
            className="flex-1 px-4 py-3 text-sm border border-[var(--mw-card-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] focus:border-[var(--mw-pink)] bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={processing || !input.trim()}
            className="px-5 py-3 rounded-xl bg-[var(--mw-pink)] text-white font-semibold text-sm hover:bg-[var(--mw-pink-hover)] transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
        <p className="text-[10px] text-[var(--mw-text-secondary)] mt-2 text-center">
          Describe what changed in plain English. Supports status updates, ETA changes, and service-level updates.
        </p>
      </div>
    </div>
  )
}
