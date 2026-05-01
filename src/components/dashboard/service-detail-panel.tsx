"use client"

import { useEffect, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { cn, getStatusColor, getStatusLabel, getDaysUntil, getDaysColor, formatDate } from "@/lib/utils"
import type { ServiceEntry } from "@/lib/repository-data"
import type { StoredItem } from "@/lib/data-store"
import {
  X,
  Globe,
  PenLine,
  TicketCheck,
  FlaskConical,
  MapPin,
  Rocket,
  PenTool,
  Clock,
  CreditCard,
  Palette,
  ListChecks,
  User,
  Calendar,
  Tag,
  Flag,
  ExternalLink,
  Wrench,
} from "lucide-react"

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  for_your_little_ones: { label: "For Your Little Ones", color: "bg-[var(--mw-pink-light)] text-[var(--mw-pink)]", icon: "👶" },
  mumz_support: { label: "Mumz Support", color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]", icon: "🏠" },
  mumz_health: { label: "Mumz Health", color: "bg-blue-50 text-blue-700", icon: "🩺" },
  tools: { label: "Tools & Platforms", color: "bg-[var(--mw-purple-light)] text-[var(--mw-purple)]", icon: "🛠" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Rocket }> = {
  live: { label: "Live", color: "bg-emerald-100 text-emerald-700", icon: Rocket },
  staging: { label: "Staging", color: "bg-blue-100 text-blue-700", icon: FlaskConical },
  in_design: { label: "In Design", color: "bg-purple-100 text-purple-700", icon: PenTool },
  planned: { label: "Planned", color: "bg-gray-100 text-gray-600", icon: Clock },
  ksa_expansion: { label: "KSA Expansion", color: "bg-amber-100 text-amber-700", icon: MapPin },
}

const DESIGN_STATUS: Record<string, { label: string; dot: string }> = {
  finalized: { label: "Finalized", dot: "bg-emerald-500" },
  in_progress: { label: "In Progress", dot: "bg-amber-500" },
  not_started: { label: "Not Started", dot: "bg-gray-400" },
  needs_update: { label: "Needs Update", dot: "bg-red-500" },
}

type FilterKey = "all" | "in_progress" | "blocked" | "overdue" | "not_started" | "done"

const FILTER_PILLS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "blocked", label: "Blocked", color: "bg-red-100 text-red-700" },
  { key: "overdue", label: "Overdue", color: "bg-orange-100 text-orange-700" },
  { key: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-600" },
  { key: "done", label: "Done", color: "bg-emerald-100 text-emerald-700" },
]

type Props = {
  service: ServiceEntry | null
  open: boolean
  onClose: () => void
  tasks?: StoredItem[]
  onTaskClick?: (item: StoredItem) => void
  lastMeetingDate?: string | null
}

export function ServiceDetailPanel({ service, open, onClose, tasks = [], onTaskClick, lastMeetingDate }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Reset filter when panel opens with new service
  useEffect(() => {
    if (open) setActiveFilter("all")
  }, [open, service?.id])

  if (!service) return null

  const statusCfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.planned
  const StatusIcon = statusCfg.icon
  const designCfg = DESIGN_STATUS[service.design_status] || DESIGN_STATUS.not_started
  const catCfg = CATEGORY_CONFIG[service.category] || CATEGORY_CONFIG.tools

  // Build quick-access links
  const quickLinks: { href: string; label: string; Icon: typeof Globe; color: string }[] = []
  if (service.production_url) quickLinks.push({ href: service.production_url, label: "Production", Icon: Globe, color: "text-emerald-400 hover:text-emerald-300" })
  if (service.staging_url) quickLinks.push({ href: service.staging_url, label: "Staging", Icon: FlaskConical, color: "text-blue-400 hover:text-blue-300" })
  if (service.figma_url) quickLinks.push({ href: service.figma_url, label: "Figma", Icon: PenLine, color: "text-purple-400 hover:text-purple-300" })
  if (service.jira_epic) quickLinks.push({ href: `https://mumz.atlassian.net/browse/${service.jira_epic}`, label: "Jira", Icon: TicketCheck, color: "text-sky-400 hover:text-sky-300" })
  if (service.vendor_tool_url) quickLinks.push({ href: service.vendor_tool_url, label: "Vendor Tool", Icon: CreditCard, color: "text-amber-400 hover:text-amber-300" })

  // Task counts and filtering
  const overdueTasks = tasks.filter(t => {
    if (t.status === "done" || t.status === "cancelled") return false
    const days = getDaysUntil(t.eta)
    return days !== null && days < 0
  })

  const filterCounts: Record<FilterKey, number> = {
    all: tasks.length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    overdue: overdueTasks.length,
    not_started: tasks.filter(t => t.status === "not_started").length,
    done: tasks.filter(t => t.status === "done").length,
  }

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === "all") return true
    if (activeFilter === "overdue") {
      if (t.status === "done" || t.status === "cancelled") return false
      const days = getDaysUntil(t.eta)
      return days !== null && days < 0
    }
    return t.status === activeFilter
  })

  // Progress stats
  const doneCount = tasks.filter(t => t.status === "done").length
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length
  const blockedCount = tasks.filter(t => t.status === "blocked").length
  const notStartedCount = tasks.filter(t => t.status === "not_started").length
  const otherCount = tasks.length - doneCount - inProgressCount - blockedCount - notStartedCount
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header — sticky navy */}
        <div className="sticky top-0 bg-[var(--mw-navy)] text-white p-6 z-10 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Badge className={cn("mb-2", catCfg.color)}>{catCfg.icon} {catCfg.label}</Badge>
              <h2 className="text-xl font-bold leading-tight">{service.name}</h2>
              <p className="text-white/70 text-sm mt-1">{service.description}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition shrink-0 ml-3">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Platform status + regions */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Badge className={cn(statusCfg.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />{statusCfg.label}
            </Badge>
            {service.regions.map(r => (
              <Badge key={r} className="bg-white/20 text-white">
                <MapPin className="w-3 h-3 mr-1" />{r}
              </Badge>
            ))}
          </div>

          {/* Quick-access link icons */}
          {quickLinks.length > 0 && (
            <div className="flex items-center gap-1 mt-4 flex-wrap">
              {quickLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition",
                    link.color
                  )}
                  title={link.label}
                >
                  <link.Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Status filter pills */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_PILLS.map(pill => {
                const count = filterCounts[pill.key]
                const isActive = activeFilter === pill.key
                return (
                  <button
                    key={pill.key}
                    onClick={() => setActiveFilter(pill.key)}
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition border",
                      isActive
                        ? cn(pill.color, "border-current ring-1 ring-current/20")
                        : "bg-white border-[var(--mw-card-border)] text-[var(--mw-text-secondary)] hover:bg-gray-50"
                    )}
                  >
                    {pill.label}
                    <span className={cn(
                      "ml-0.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center",
                      isActive ? "bg-white/30" : "bg-gray-100"
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Progress section */}
          {tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide">
                  Progress
                </h3>
                <span className="text-sm font-bold text-[var(--mw-text-primary)]">{progressPct}%</span>
              </div>
              {/* Stacked bar */}
              <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
                {doneCount > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(doneCount / tasks.length) * 100}%` }}
                    title={`Done: ${doneCount}`}
                  />
                )}
                {inProgressCount > 0 && (
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${(inProgressCount / tasks.length) * 100}%` }}
                    title={`In Progress: ${inProgressCount}`}
                  />
                )}
                {blockedCount > 0 && (
                  <div
                    className="bg-red-400 transition-all duration-500"
                    style={{ width: `${(blockedCount / tasks.length) * 100}%` }}
                    title={`Blocked: ${blockedCount}`}
                  />
                )}
                {(notStartedCount + otherCount) > 0 && (
                  <div
                    className="bg-gray-300 transition-all duration-500"
                    style={{ width: `${((notStartedCount + otherCount) / tasks.length) * 100}%` }}
                    title={`Not Started: ${notStartedCount + otherCount}`}
                  />
                )}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--mw-text-secondary)]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Done {doneCount}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress {inProgressCount}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Blocked {blockedCount}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Not Started {notStartedCount}</span>
              </div>
            </div>
          )}

          {/* Task list */}
          {tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Tasks ({filteredTasks.length}{activeFilter !== "all" ? ` ${FILTER_PILLS.find(p => p.key === activeFilter)?.label}` : ""})
              </h3>
              <div className="space-y-2">
                {filteredTasks.length === 0 && (
                  <p className="text-xs text-[var(--mw-text-secondary)] text-center py-4">No tasks match this filter.</p>
                )}
                {filteredTasks.map(item => {
                  const days = getDaysUntil(item.eta)
                  const isNewlyDone = item.status === "done" && lastMeetingDate && item.updated_at > lastMeetingDate
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-xl border transition",
                        isNewlyDone
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-[var(--mw-card-border)]",
                        onTaskClick ? "cursor-pointer hover:border-[var(--mw-pink)]/30 hover:bg-[var(--mw-pink-light)]/20" : ""
                      )}
                      onClick={() => onTaskClick?.(item)}
                    >
                      <div className="flex items-start gap-2">
                        <Badge className={cn(getStatusColor(item.status), "text-[10px] px-1.5 py-0 shrink-0 mt-0.5")}>
                          {getStatusLabel(item.status)}
                        </Badge>
                        <span className="text-xs font-medium text-[var(--mw-text-primary)] flex-1 leading-snug">{item.title}</span>
                        {isNewlyDone && (
                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {item.owner_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--mw-text-secondary)]">
                            <User className="w-3 h-3" />{item.owner_name}
                          </span>
                        )}
                        {item.eta && (
                          <span className={cn("inline-flex items-center gap-1 text-[10px]", getDaysColor(days, item.status))}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.eta)}
                            {days !== null && item.status !== "done" && item.status !== "cancelled" && (
                              <span className="font-medium">
                                {days === 0 ? "(today)" : days > 0 ? `(${days}d)` : `(${Math.abs(days)}d late)`}
                              </span>
                            )}
                          </span>
                        )}
                        {item.priority && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--mw-text-secondary)]">
                            <Flag className="w-3 h-3" />{item.priority.toUpperCase()}
                          </span>
                        )}
                        {item.workstream && (
                          <Badge className="bg-[var(--mw-purple-light)] text-[var(--mw-purple)] text-[10px] px-1.5 py-0 capitalize">
                            {item.workstream}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Design Status */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Design Status
            </h3>
            <div className="flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full", designCfg.dot)} />
              <span className="text-sm font-medium text-[var(--mw-text-primary)]">{designCfg.label}</span>
            </div>
          </div>

          {/* Ownership */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3">Ownership</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--mw-bg)] border border-[var(--mw-card-border)]">
                <p className="text-xs text-[var(--mw-text-secondary)]">Tech Owner</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-7 h-7 rounded-full bg-[var(--mw-navy)] flex items-center justify-center text-white text-xs font-bold">
                    {service.tech_owner[0]}
                  </div>
                  <span className="text-sm font-medium text-[var(--mw-text-primary)]">{service.tech_owner}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mw-bg)] border border-[var(--mw-card-border)]">
                <p className="text-xs text-[var(--mw-text-secondary)]">Business Owner</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-7 h-7 rounded-full bg-[var(--mw-pink)] flex items-center justify-center text-white text-xs font-bold">
                    {service.business_owner[0]}
                  </div>
                  <span className="text-sm font-medium text-[var(--mw-text-primary)]">{service.business_owner}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Launch Date */}
          {service.launch_date && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-2">Launch Date</h3>
              <p className="text-sm text-[var(--mw-text-primary)]">{service.launch_date}</p>
            </div>
          )}

          {/* Notes */}
          {service.notes && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-2">Notes</h3>
              <div className="p-3 rounded-xl bg-[var(--mw-amber-light)]/50 border border-amber-200 text-sm text-[var(--mw-text-primary)]">
                {service.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
