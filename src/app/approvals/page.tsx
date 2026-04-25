"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Mail,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Zap,
  Info,
  GitCompare,
  Loader2,
  Filter,
} from "lucide-react"

type ApprovalItem = {
  id: string
  source: 'slack' | 'email' | 'meeting' | 'manual'
  source_detail: string
  type: 'status_change' | 'new_item' | 'eta_change' | 'conflict' | 'info_update'
  title: string
  description: string
  related_item_id: string | null
  related_item_title: string | null
  related_category: string | null
  suggested_action: string | null
  status: 'pending' | 'approved' | 'dismissed'
  detected_at: string
  resolved_at: string | null
}

const SOURCE_CONFIG = {
  slack: { label: "Slack", icon: MessageSquare, color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  email: { label: "Email", icon: Mail, color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  meeting: { label: "Meeting", icon: Users, color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]", dot: "bg-[var(--mw-teal)]" },
  manual: { label: "Manual", icon: Info, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
}

const TYPE_CONFIG = {
  status_change: { label: "Status Change", icon: ArrowRight, color: "bg-blue-50 text-blue-700", borderColor: "border-l-blue-500" },
  new_item: { label: "New Item", icon: Plus, color: "bg-[var(--mw-purple-light)] text-[var(--mw-purple)]", borderColor: "border-l-[var(--mw-purple)]" },
  eta_change: { label: "ETA Change", icon: Clock, color: "bg-[var(--mw-amber-light)] text-amber-700", borderColor: "border-l-[var(--mw-amber)]" },
  conflict: { label: "Conflict", icon: GitCompare, color: "bg-[var(--mw-coral-light)] text-[var(--mw-coral)]", borderColor: "border-l-[var(--mw-coral)]" },
  info_update: { label: "Info Update", icon: Info, color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]", borderColor: "border-l-[var(--mw-teal)]" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')

  useEffect(() => {
    fetch("/api/approvals")
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleResolve(id: string, status: 'approved' | 'dismissed') {
    setProcessing(prev => new Set(prev).add(id))
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems(prev => prev.map(a => a.id === id ? updated : a))
      }
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const filtered = items.filter(a => {
    if (filter === 'pending' && a.status !== 'pending') return false
    if (filter === 'resolved' && a.status === 'pending') return false
    if (typeFilter && a.type !== typeFilter) return false
    return true
  })

  const pendingCount = items.filter(a => a.status === 'pending').length
  const conflictCount = items.filter(a => a.type === 'conflict' && a.status === 'pending').length

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--mw-coral-light)]">
              <ShieldCheck className="w-6 h-6 text-[var(--mw-coral)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Update Approvals</h1>
              <p className="text-sm text-[var(--mw-text-secondary)] mt-0.5">
                Flagged updates from Slack, email, and meetings that need your review
              </p>
            </div>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            {conflictCount > 0 && (
              <Badge className="bg-[var(--mw-coral-light)] text-[var(--mw-coral)] px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />{conflictCount} Conflicts
              </Badge>
            )}
            <Badge className="bg-[var(--mw-amber-light)] text-amber-700 px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1" />{pendingCount} Pending
            </Badge>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Flagged", value: items.length, icon: ShieldCheck, bg: "bg-gray-100", color: "text-[var(--mw-navy)]" },
          { label: "Pending Review", value: pendingCount, icon: Clock, bg: "bg-[var(--mw-amber-light)]", color: "text-amber-700" },
          { label: "Conflicts", value: conflictCount, icon: AlertTriangle, bg: "bg-[var(--mw-coral-light)]", color: "text-[var(--mw-coral)]" },
          { label: "Resolved", value: items.filter(a => a.status !== 'pending').length, icon: CheckCircle2, bg: "bg-[var(--mw-teal-light)]", color: "text-[var(--mw-teal)]" },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="py-4 px-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", card.bg)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                <p className="text-xs text-[var(--mw-text-secondary)]">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'pending', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filter === f
                  ? "bg-white text-[var(--mw-navy)] shadow-sm"
                  : "text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)]"
              )}>
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Resolved'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                typeFilter === key
                  ? cn(cfg.color, "border-current")
                  : "bg-white text-[var(--mw-text-secondary)] border-[var(--mw-card-border)] hover:border-gray-300"
              )}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approval Items */}
      {loading ? (
        <div className="text-center py-12 text-[var(--mw-text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading approvals...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-[var(--mw-teal)] mx-auto mb-3" />
          <p className="text-[var(--mw-text-primary)] font-medium">All clear!</p>
          <p className="text-sm text-[var(--mw-text-secondary)] mt-1">No items match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const sourceCfg = SOURCE_CONFIG[item.source]
            const typeCfg = TYPE_CONFIG[item.type]
            const isPending = item.status === 'pending'
            const isProcessing = processing.has(item.id)

            return (
              <Card key={item.id} className={cn(
                "border-l-4 transition-all",
                typeCfg.borderColor,
                !isPending && "opacity-60"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", typeCfg.color.split(' ')[0])}>
                      <typeCfg.icon className={cn("w-5 h-5", typeCfg.color.split(' ')[1])} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[var(--mw-text-primary)]">{item.title}</h3>
                          <p className="text-sm text-[var(--mw-text-secondary)] mt-0.5">{item.description}</p>
                        </div>
                        <span className="text-xs text-[var(--mw-text-secondary)] shrink-0">{timeAgo(item.detected_at)}</span>
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={sourceCfg.color}>
                          <sourceCfg.icon className="w-3 h-3 mr-1" />{sourceCfg.label}
                        </Badge>
                        <Badge className={typeCfg.color}>{typeCfg.label}</Badge>
                        {item.related_category && (
                          <Badge className="bg-gray-100 text-gray-600">{item.related_category}</Badge>
                        )}
                        {item.related_item_title && (
                          <span className="text-xs text-[var(--mw-text-secondary)] italic">
                            Related: {item.related_item_title}
                          </span>
                        )}
                      </div>

                      {/* Source Detail */}
                      <p className="text-xs text-[var(--mw-text-secondary)] flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sourceCfg.dot)} />
                        {item.source_detail}
                      </p>

                      {/* Suggested Action */}
                      {item.suggested_action && isPending && (
                        <div className="bg-[var(--mw-bg)] rounded-lg px-3 py-2 text-sm">
                          <span className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wide">Suggested: </span>
                          <span className="text-[var(--mw-text-primary)]">{item.suggested_action}</span>
                        </div>
                      )}

                      {/* Actions */}
                      {isPending ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResolve(item.id, 'approved')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mw-teal)] text-white rounded-xl text-xs font-medium hover:opacity-90 transition disabled:opacity-50">
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve & Apply
                          </button>
                          <button
                            onClick={() => handleResolve(item.id, 'dismissed')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-200 transition disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs">
                          {item.status === 'approved' ? (
                            <><CheckCircle2 className="w-3.5 h-3.5 text-[var(--mw-teal)]" /><span className="text-[var(--mw-teal)] font-medium">Approved</span></>
                          ) : (
                            <><XCircle className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-400 font-medium">Dismissed</span></>
                          )}
                          {item.resolved_at && (
                            <span className="text-[var(--mw-text-secondary)] ml-1">{timeAgo(item.resolved_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
