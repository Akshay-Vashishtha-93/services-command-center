"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel, getDaysUntil, getDaysColor, formatDate, cn } from "@/lib/utils"
import { X, Edit3, User, Calendar, Flag, Tag, FileText, MessageSquare, Layers, Clock } from "lucide-react"
import type { StoredItem } from "@/lib/data-store"

export type PanelItem = StoredItem

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
  { value: "on_hold", label: "On Hold" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
]

type Props = {
  item: PanelItem | null
  open: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<PanelItem>) => Promise<PanelItem | null>
}

export function ItemDetailPanel({ item, open, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<PanelItem>>({})
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setEditing(false)
      setDraft({})
    }
  }, [open])

  const startEdit = () => {
    if (!item) return
    setDraft({
      status: item.status,
      eta: item.eta || "",
      owner_name: item.owner_name || "",
      priority: item.priority || "",
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!item) return
    setSaving(true)
    const updates: Partial<PanelItem> = {}
    if (draft.status !== item.status) updates.status = draft.status
    if (draft.eta !== (item.eta || "")) updates.eta = draft.eta || null
    if (draft.owner_name !== (item.owner_name || "")) updates.owner_name = draft.owner_name || null
    if (draft.priority !== (item.priority || "")) updates.priority = draft.priority || null

    if (Object.keys(updates).length > 0) {
      await onUpdate(item.id, updates)
    }
    setSaving(false)
    setEditing(false)
    setDraft({})
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl border-l border-[var(--mw-card-border)] transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {item && (
          <>
            {/* Panel Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--mw-card-border)] bg-gradient-to-r from-[var(--mw-navy)] to-[var(--mw-navy-light)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {item.item_number && (
                    <span className="text-white/60 text-sm font-mono">#{item.item_number}</span>
                  )}
                  <Badge className={cn(getStatusColor(item.status), "text-xs")}>
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-white leading-snug">{item.title}</h3>
              {item.category_name && (
                <Badge className="mt-2 bg-white/15 text-white/90 text-xs">{item.category_name}</Badge>
              )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[var(--mw-bg)] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Owner</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">{item.owner_name || "\u2014"}</p>
                  {item.owner_secondary_name && (
                    <p className="text-xs text-[var(--mw-text-secondary)] mt-0.5">{item.owner_secondary_name}</p>
                  )}
                </div>
                <div className="rounded-xl bg-[var(--mw-bg)] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">ETA</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">{formatDate(item.eta)}</p>
                  {(() => {
                    const days = getDaysUntil(item.eta)
                    if (days === null || item.status === 'done' || item.status === 'cancelled') return null
                    return (
                      <p className={cn("text-xs mt-0.5 font-medium", getDaysColor(days, item.status))}>
                        {days === 0 ? "Due today" : days > 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`}
                      </p>
                    )
                  })()}
                </div>
                <div className="rounded-xl bg-[var(--mw-bg)] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flag className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Priority</span>
                  </div>
                  {item.priority ? (
                    <Badge className={cn("border text-xs", getPriorityColor(item.priority))}>
                      {getPriorityLabel(item.priority)}
                    </Badge>
                  ) : (
                    <p className="text-sm text-[var(--mw-text-secondary)]">{"\u2014"}</p>
                  )}
                </div>
                <div className="rounded-xl bg-[var(--mw-bg)] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Workstream</span>
                  </div>
                  {item.workstream ? (
                    <Badge className="bg-[var(--mw-purple-light)] text-[var(--mw-purple)] capitalize text-xs">{item.workstream}</Badge>
                  ) : (
                    <p className="text-sm text-[var(--mw-text-secondary)]">{"\u2014"}</p>
                  )}
                </div>
              </div>

              {item.details && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Details / Acceptance Criteria</span>
                  </div>
                  <div className="rounded-xl bg-[var(--mw-bg)] p-3">
                    <p className="text-sm text-[var(--mw-text-primary)] leading-relaxed whitespace-pre-wrap">{item.details}</p>
                  </div>
                </div>
              )}

              {item.expected_impact && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Layers className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Expected Impact</span>
                  </div>
                  <div className="rounded-xl bg-[var(--mw-teal-light)]/50 border border-[var(--mw-teal)]/20 p-3">
                    <p className="text-sm text-[var(--mw-text-primary)] leading-relaxed whitespace-pre-wrap">{item.expected_impact}</p>
                  </div>
                </div>
              )}

              {item.remarks && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                    <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Remarks</span>
                  </div>
                  <div className="rounded-xl bg-[var(--mw-amber-light)]/50 border border-[var(--mw-amber)]/20 p-3">
                    <p className="text-sm text-[var(--mw-text-primary)] leading-relaxed whitespace-pre-wrap">{item.remarks}</p>
                  </div>
                </div>
              )}

              {(item.sprint || item.sheet_tab) && (
                <div className="flex gap-3">
                  {item.sprint && (
                    <div className="flex-1 rounded-xl bg-[var(--mw-bg)] p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                        <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Sprint</span>
                      </div>
                      <p className="text-sm text-[var(--mw-text-primary)]">{item.sprint}</p>
                    </div>
                  )}
                  {item.sheet_tab && (
                    <div className="flex-1 rounded-xl bg-[var(--mw-bg)] p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-[var(--mw-text-secondary)]" />
                        <span className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Source Tab</span>
                      </div>
                      <p className="text-sm text-[var(--mw-text-primary)]">{item.sheet_tab}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Inline edit form */}
            {editing && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--mw-card-border)] bg-[var(--mw-bg)] space-y-3">
                <p className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide">Edit Fields</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={draft.status || ""}
                      onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                      className="w-full text-xs border border-[var(--mw-card-border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider block mb-1">Priority</label>
                    <select
                      value={draft.priority || ""}
                      onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
                      className="w-full text-xs border border-[var(--mw-card-border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
                    >
                      <option value="">None</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider block mb-1">ETA</label>
                    <input
                      type="date"
                      value={draft.eta || ""}
                      onChange={e => setDraft(d => ({ ...d, eta: e.target.value }))}
                      className="w-full text-xs border border-[var(--mw-card-border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider block mb-1">Owner</label>
                    <input
                      type="text"
                      value={draft.owner_name || ""}
                      onChange={e => setDraft(d => ({ ...d, owner_name: e.target.value }))}
                      className="w-full text-xs border border-[var(--mw-card-border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
                      placeholder="Owner name"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: "var(--mw-teal)" }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setDraft({}) }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--mw-card-border)] text-[var(--mw-text-primary)] bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Panel Footer */}
            {!editing && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--mw-card-border)] bg-[var(--mw-bg)] flex gap-3">
                <button
                  onClick={startEdit}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                  style={{ backgroundColor: "var(--mw-pink)", color: "#fff" }}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--mw-card-border)] text-[var(--mw-text-primary)] bg-white hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
