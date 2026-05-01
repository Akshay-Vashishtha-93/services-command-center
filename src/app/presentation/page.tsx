"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, getStatusColor, getStatusLabel, formatDate } from "@/lib/utils"
import {
  CheckCircle2,
  Calendar,
  Printer,
  Loader2,
  ArrowRight,
  CircleDot,
} from "lucide-react"
import type { StoredItem } from "@/lib/data-store"

export default function WeeklyCharterPage() {
  const [items, setItems] = useState<StoredItem[]>([])
  const [lastMeetingDate, setLastMeetingDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/items?tab=Services+Enhancement").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
    ])
      .then(([itemsData, settings]) => {
        setItems(itemsData)
        setLastMeetingDate(settings.last_meeting_date)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(
    () => items.filter(i => i.sheet_tab === "Services Enhancement" && !i.is_archived),
    [items]
  )

  // Group items by category, find what moved to done since last meeting
  const serviceUpdates = useMemo(() => {
    const byCategory = new Map<string, { newlyDone: StoredItem[]; stillActive: StoredItem[]; total: number; doneTotal: number }>()

    for (const item of filteredItems) {
      const cat = item.category_name
      if (!byCategory.has(cat)) byCategory.set(cat, { newlyDone: [], stillActive: [], total: 0, doneTotal: 0 })
      const entry = byCategory.get(cat)!
      entry.total++

      if (item.status === "done") {
        entry.doneTotal++
        if (lastMeetingDate && item.updated_at > lastMeetingDate) {
          entry.newlyDone.push(item)
        }
      } else if (item.status !== "cancelled") {
        entry.stillActive.push(item)
      }
    }

    return Array.from(byCategory.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter(s => s.newlyDone.length > 0 || s.stillActive.length > 0)
      .sort((a, b) => b.newlyDone.length - a.newlyDone.length)
  }, [filteredItems, lastMeetingDate])

  const totalNewlyDone = serviceUpdates.reduce((s, c) => s + c.newlyDone.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--mw-navy)]" />
          <p className="text-[var(--mw-text-secondary)] text-sm">Loading charter data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)] tracking-tight">
            Weekly Services Charter
          </h1>
          <p className="text-[var(--mw-text-secondary)] text-sm mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {lastMeetingDate
              ? `Changes since ${new Date(lastMeetingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : "No meeting date set — set one via Sync on the dashboard"
            }
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--mw-card-border)] bg-white text-[var(--mw-text-secondary)] hover:bg-gray-50 hover:text-[var(--mw-navy)] transition text-sm font-medium shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* Summary card */}
      <Card className="bg-gradient-to-r from-[var(--mw-navy)] to-[#002a4e] text-white">
        <CardContent className="py-6 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider font-medium">Completed since last meeting</p>
            <p className="text-4xl font-bold mt-1">{totalNewlyDone}</p>
            <p className="text-white/50 text-sm mt-1">across {serviceUpdates.filter(s => s.newlyDone.length > 0).length} services</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{filteredItems.length}</p>
              <p className="text-white/50 text-xs">Total Items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-300">{filteredItems.filter(i => i.status === "done").length}</p>
              <p className="text-white/50 text-xs">Done</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-300">{filteredItems.filter(i => i.status === "in_progress").length}</p>
              <p className="text-white/50 text-xs">In Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No meeting date warning */}
      {!lastMeetingDate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No meeting reference date is set. Go to the Dashboard, click <strong>Sync</strong>, check "Update meeting reference date", and set the date of your last presentation. All items completed after that date will appear here.
        </div>
      )}

      {/* Service-wise updates */}
      <div className="space-y-6">
        {serviceUpdates.map(service => {
          const pct = service.total > 0 ? Math.round((service.doneTotal / service.total) * 100) : 0
          return (
            <Card key={service.name}>
              <CardContent className="p-6 space-y-4">
                {/* Service header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--mw-navy)]/5 flex items-center justify-center">
                      <CircleDot className="w-5 h-5 text-[var(--mw-navy)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--mw-text-primary)]">{service.name}</h3>
                      <p className="text-xs text-[var(--mw-text-secondary)]">
                        {service.doneTotal}/{service.total} done ({pct}%)
                      </p>
                    </div>
                  </div>
                  {service.newlyDone.length > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {service.newlyDone.length} completed
                    </Badge>
                  )}
                </div>

                {/* Newly done items */}
                {service.newlyDone.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Moved to Done
                    </p>
                    {service.newlyDone.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--mw-text-primary)]">{item.title}</p>
                          <p className="text-xs text-[var(--mw-text-secondary)] mt-0.5">
                            {item.owner_name || "Unassigned"} {item.workstream && <span className="ml-2 text-[var(--mw-purple)]">{item.workstream}</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Still active items */}
                {service.stillActive.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">
                      Still Active ({service.stillActive.length})
                    </p>
                    {service.stillActive.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5">
                        <Badge className={cn(getStatusColor(item.status), "text-[10px] px-1.5 py-0 shrink-0")}>
                          {getStatusLabel(item.status)}
                        </Badge>
                        <span className="text-sm text-[var(--mw-text-primary)] truncate flex-1">{item.title}</span>
                        <span className="text-xs text-[var(--mw-text-secondary)] shrink-0">{item.owner_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {serviceUpdates.length === 0 && lastMeetingDate && (
        <div className="text-center py-12 text-[var(--mw-text-secondary)]">
          <p className="text-lg font-medium">No updates since the last meeting</p>
          <p className="text-sm mt-1">All items remain in their previous status.</p>
        </div>
      )}
    </div>
  )
}
