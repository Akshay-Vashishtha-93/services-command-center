"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getStatusColor, getStatusLabel, getPriorityColor, getDaysUntil, getDaysColor, formatDate, cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Search, Eye, EyeOff } from "lucide-react"
import { ItemDetailPanel, type PanelItem } from "./item-detail-panel"

type Item = PanelItem

type GroupedItems = {
  [category: string]: Item[]
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
  { value: "on_hold", label: "On Hold" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
]

const STATUS_FILTER_PILLS = [
  { value: "", label: "All", color: "bg-[var(--mw-navy)]/10 text-[var(--mw-navy)]", activeColor: "bg-[var(--mw-navy)] text-white" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-50 text-[var(--mw-navy)]", activeColor: "bg-[var(--mw-navy)] text-white" },
  { value: "blocked", label: "Blocked", color: "bg-[var(--mw-coral-light)] text-[var(--mw-coral)]", activeColor: "bg-[var(--mw-coral)] text-white" },
  { value: "overdue", label: "Overdue", color: "bg-red-50 text-red-600", activeColor: "bg-red-600 text-white" },
  { value: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-600", activeColor: "bg-gray-600 text-white" },
  { value: "done", label: "Done", color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]", activeColor: "bg-[var(--mw-teal)] text-white" },
]

export function ItemsTable() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("")
  const [filterOwner, setFilterOwner] = useState<string>("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const fetchItems = useCallback(() => {
    fetch("/api/items?tab=Services+Enhancement")
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openPanel = (item: Item) => {
    setSelectedItem(item)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setTimeout(() => setSelectedItem(null), 300)
  }

  const handlePanelUpdate = async (id: string, updates: Partial<Item>): Promise<Item | null> => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(items.map(i => i.id === id ? { ...i, ...updated } : i))
      if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, ...updated })
      return updated
    }
    return null
  }

  const updateItem = async (id: string, field: string, value: string) => {
    setEditingCell(null)
    const prev = items.find(i => i.id === id)
    if (!prev) return

    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, [field]: value })
    }

    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value })
    })
    if (!res.ok) {
      setItems(items.map(i => i.id === id ? prev : i))
      if (selectedItem?.id === id) setSelectedItem(prev)
    }
  }

  // Compute counts for status pills
  const statusCounts: Record<string, number> = { "": items.length }
  items.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
  })
  statusCounts["overdue"] = items.filter(item => {
    const d = getDaysUntil(item.eta)
    return d !== null && d < 0 && item.status !== 'done' && item.status !== 'cancelled'
  }).length

  // Filter items
  let filtered = items.filter(item => {
    if (!showCompleted && filterStatus !== "done" && (item.status === "done" || item.status === "cancelled")) return false
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
        !item.owner_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus === "overdue") {
      const d = getDaysUntil(item.eta)
      if (!(d !== null && d < 0 && item.status !== 'done' && item.status !== 'cancelled')) return false
    } else if (filterStatus && item.status !== filterStatus) return false
    if (filterCategory && item.category_name !== filterCategory) return false
    if (filterOwner && item.owner_name !== filterOwner) return false
    return true
  })

  // Group by category
  const grouped: GroupedItems = {}
  filtered.forEach(item => {
    const cat = item.category_name || "Uncategorized"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  // Sort groups: groups with overdue items first
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aOverdue = a.filter(i => { const d = getDaysUntil(i.eta); return d !== null && d < 0 && i.status !== 'done' }).length
    const bOverdue = b.filter(i => { const d = getDaysUntil(i.eta); return d !== null && d < 0 && i.status !== 'done' }).length
    return bOverdue - aOverdue
  })

  const owners = [...new Set(items.map(i => i.owner_name).filter(Boolean))] as string[]
  const categories = [...new Set(items.map(i => i.category_name).filter(Boolean))] as string[]

  const toggleGroup = (cat: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setCollapsedGroups(next)
  }

  if (loading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-12 text-center text-[var(--mw-text-secondary)]">
          Loading initiatives...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Title + Search Row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-[var(--mw-text-primary)]">
              Initiatives <span className="text-[var(--mw-text-secondary)] font-normal text-sm">({filtered.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--mw-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-[var(--mw-card-border)] rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] focus:border-[var(--mw-pink)] bg-white"
                />
              </div>
              <select
                value={filterOwner}
                onChange={e => setFilterOwner(e.target.value)}
                className="text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] focus:border-[var(--mw-pink)] bg-white"
              >
                <option value="">All Owners</option>
                {owners.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition",
                  showCompleted
                    ? "bg-[var(--mw-pink-light)] text-[var(--mw-pink)] border-[var(--mw-pink)]"
                    : "text-[var(--mw-text-secondary)] border-[var(--mw-card-border)] hover:bg-gray-50"
                )}
              >
                {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showCompleted ? "Hide Done" : "Show Done"}
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wide mr-1">Status:</span>
            {STATUS_FILTER_PILLS.map(pill => {
              const isActive = filterStatus === pill.value
              const count = statusCounts[pill.value] || 0
              return (
                <button
                  key={pill.value}
                  onClick={() => setFilterStatus(isActive ? "" : pill.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isActive
                      ? `${pill.activeColor} border-transparent shadow-sm`
                      : `${pill.color} border-transparent hover:shadow-sm`
                  )}
                >
                  {pill.label}
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                    isActive ? "bg-white/25" : "bg-black/5"
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wide mr-1">Category:</span>
            <button
              onClick={() => setFilterCategory("")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                filterCategory === ""
                  ? "bg-[var(--mw-purple)] text-white border-transparent shadow-sm"
                  : "bg-[var(--mw-purple-light)] text-[var(--mw-purple)] border-transparent hover:shadow-sm"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  filterCategory === cat
                    ? "bg-[var(--mw-purple)] text-white border-transparent shadow-sm"
                    : "bg-[var(--mw-purple-light)] text-[var(--mw-purple)] border-transparent hover:shadow-sm"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--mw-navy)] text-white">
              <th className="text-left px-4 py-3 font-medium text-white/80 w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-white/80 min-w-[280px]">Initiative</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">Type</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">Status</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">ETA</th>
              <th className="text-left px-4 py-3 font-medium text-white/80">Days</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(([category, catItems]) => {
              const isCollapsed = collapsedGroups.has(category)
              const activeInCategory = catItems.filter(i => i.status !== 'done' && i.status !== 'cancelled').length
              const overdueInCategory = catItems.filter(i => {
                const d = getDaysUntil(i.eta)
                return d !== null && d < 0 && i.status !== 'done' && i.status !== 'cancelled'
              }).length
              const doneInCategory = catItems.filter(i => i.status === 'done').length
              const catPct = catItems.length > 0 ? Math.round((doneInCategory / catItems.length) * 100) : 0

              return (
                <Fragment key={category}>
                  <tr
                    className="bg-blue-50/60 cursor-pointer hover:bg-blue-50 transition"
                    onClick={() => toggleGroup(category)}
                  >
                    <td colSpan={8} className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {isCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--mw-navy)]" /> : <ChevronDown className="w-4 h-4 text-[var(--mw-navy)]" />}
                        <span className="font-semibold text-[var(--mw-navy)]">{category}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${catPct}%`,
                                backgroundColor: catPct === 100 ? "var(--mw-teal)" : "var(--mw-navy)"
                              }}
                            />
                          </div>
                          <span className="text-xs text-[var(--mw-text-secondary)]">{catPct}%</span>
                        </div>
                        <Badge className="bg-[var(--mw-navy)]/10 text-[var(--mw-navy)]">{activeInCategory} active</Badge>
                        {overdueInCategory > 0 && (
                          <Badge className="bg-[var(--mw-coral-light)] text-[var(--mw-coral)]">{overdueInCategory} overdue</Badge>
                        )}
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed && catItems.map(item => {
                    const days = getDaysUntil(item.eta)

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[var(--mw-card-border)] hover:bg-[var(--mw-pink-light)]/30 transition cursor-pointer",
                          item.status === 'blocked' && "bg-[var(--mw-coral-light)]/30",
                          days !== null && days < 0 && item.status !== 'done' && "bg-red-50/30",
                          selectedItem?.id === item.id && panelOpen && "bg-[var(--mw-pink-light)]/50"
                        )}
                        onClick={() => openPanel(item)}
                      >
                        <td className="px-4 py-2.5 text-[var(--mw-text-secondary)] text-xs">{item.item_number}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[var(--mw-text-primary)]">{item.title}</span>
                          {item.source && (
                            <span className="ml-2 text-xs text-[var(--mw-text-secondary)]">{item.source}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--mw-text-primary)] whitespace-nowrap">
                          {item.owner_name || "\u2014"}
                          {item.owner_secondary_name && (
                            <span className="text-[var(--mw-text-secondary)] text-xs block">{item.owner_secondary_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.workstream && (
                            <Badge className={
                              item.workstream === "tech"     ? "bg-blue-50 text-blue-700" :
                              item.workstream === "brand"    ? "bg-[var(--mw-pink-light)] text-[var(--mw-pink)]" :
                              item.workstream === "design"   ? "bg-[var(--mw-purple-light)] text-[var(--mw-purple)]" :
                              item.workstream === "strategy" ? "bg-amber-50 text-amber-700" :
                              "bg-gray-100 text-gray-600"
                            }>{item.workstream}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5" onClick={e => { e.stopPropagation(); setEditingCell({ id: item.id, field: 'status' }) }}>
                          {editingCell?.id === item.id && editingCell?.field === 'status' ? (
                            <select
                              autoFocus
                              value={item.status}
                              onChange={e => updateItem(item.id, 'status', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              className="text-xs border border-[var(--mw-pink)] rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.priority && (
                            <Badge className={cn("border", getPriorityColor(item.priority))}>
                              {item.priority?.toUpperCase()}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--mw-text-secondary)] whitespace-nowrap">{formatDate(item.eta)}</td>
                        <td className={cn("px-4 py-2.5 whitespace-nowrap", getDaysColor(days, item.status))}>
                          {days !== null && item.status !== 'done' && item.status !== 'cancelled'
                            ? days === 0 ? "Today" : days > 0 ? `${days}d` : `${Math.abs(days)}d late`
                            : "\u2014"}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--mw-text-secondary)]">
            No items match your filters
          </div>
        )}
      </div>

      <ItemDetailPanel
        item={selectedItem}
        open={panelOpen}
        onClose={closePanel}
        onUpdate={handlePanelUpdate}
      />
    </>
  )
}
