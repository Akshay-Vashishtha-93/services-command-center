"use client"

import { useState, useMemo } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, getStatusColor, getStatusLabel, getDaysUntil, formatDate } from "@/lib/utils"
import { getRepositoryData, type ServiceEntry } from "@/lib/repository-data"
import { CATEGORY_TO_SERVICE } from "@/lib/service-items-map"
import { ItemDetailPanel } from "./item-detail-panel"
import { ServiceDetailPanel } from "./service-detail-panel"
import type { StoredItem } from "@/lib/data-store"
import {
  Search,
  MapPin,
  Users,
  Palette,
  Rocket,
  FlaskConical,
  PenTool,
  Clock,
  Eye,
} from "lucide-react"

type Props = {
  items: StoredItem[]
  onItemsChange: (items: StoredItem[]) => void
  lastMeetingDate?: string | null
}

const PLATFORM_STATUS: Record<string, { label: string; color: string; icon: typeof Rocket }> = {
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

function StackedBar({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div className="h-2.5 rounded-full bg-gray-100 w-full" />
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-gray-100">
      {segments.map((seg, i) =>
        seg.value > 0 ? (
          <div
            key={i}
            className="h-full transition-all duration-500"
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.value}`}
          />
        ) : null
      )}
    </div>
  )
}

export function ServiceHub({ items, onItemsChange, lastMeetingDate }: Props) {
  const [search, setSearch] = useState("")
  const [panelItem, setPanelItem] = useState<StoredItem | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [servicePanel, setServicePanel] = useState<ServiceEntry | null>(null)
  const [servicePanelOpen, setServicePanelOpen] = useState(false)

  const services = useMemo(() => getRepositoryData(), [])

  const serviceItemsMap = useMemo(() => {
    const map: Record<string, StoredItem[]> = {}
    items.forEach(item => {
      const serviceId = CATEGORY_TO_SERVICE[item.category_name]
      if (serviceId) {
        if (!map[serviceId]) map[serviceId] = []
        map[serviceId].push(item)
      }
    })
    return map
  }, [items])

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const aItems = serviceItemsMap[a.id] || []
      const bItems = serviceItemsMap[b.id] || []
      const aActive = aItems.filter(i => i.status !== "done" && i.status !== "cancelled").length
      const bActive = bItems.filter(i => i.status !== "done" && i.status !== "cancelled").length
      if (aActive !== bActive) return bActive - aActive
      if (aItems.length !== bItems.length) return bItems.length - aItems.length
      return a.name.localeCompare(b.name)
    })
  }, [services, serviceItemsMap])

  const filteredServices = useMemo(() => {
    if (!search) return sortedServices
    const q = search.toLowerCase()
    return sortedServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tech_owner.toLowerCase().includes(q) ||
      s.business_owner.toLowerCase().includes(q)
    )
  }, [sortedServices, search])

  const openItemPanel = (item: StoredItem) => { setPanelItem(item); setPanelOpen(true) }
  const closeItemPanel = () => { setPanelOpen(false); setTimeout(() => setPanelItem(null), 300) }
  const openServicePanel = (service: ServiceEntry) => { setServicePanel(service); setServicePanelOpen(true) }
  const closeServicePanel = () => { setServicePanelOpen(false); setTimeout(() => setServicePanel(null), 300) }

  const handleItemUpdate = async (id: string, updates: Partial<StoredItem>): Promise<StoredItem | null> => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      onItemsChange(items.map(i => i.id === id ? { ...i, ...updated } : i))
      if (panelItem?.id === id) setPanelItem({ ...panelItem, ...updated })
      return updated
    }
    return null
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold text-[var(--mw-text-primary)]">
          Services <span className="text-[var(--mw-text-secondary)] font-normal text-sm">({services.length} services, {items.length} tasks)</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--mw-text-secondary)]" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-[var(--mw-card-border)] rounded-xl w-48 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
          />
        </div>
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredServices.map(service => {
          const svcItems = serviceItemsMap[service.id] || []
          const platformCfg = PLATFORM_STATUS[service.status] || PLATFORM_STATUS.planned
          const PlatformIcon = platformCfg.icon
          const designCfg = DESIGN_STATUS[service.design_status] || DESIGN_STATUS.not_started

          const doneCount = svcItems.filter(i => i.status === "done").length
          const inProgressCount = svcItems.filter(i => i.status === "in_progress").length
          const blockedCount = svcItems.filter(i => i.status === "blocked" || i.status === "on_hold").length
          const notStartedCount = svcItems.filter(i => i.status === "not_started").length
          const totalCount = svcItems.length
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

          const quickLinks = [
            { url: service.production_url, color: "bg-emerald-500", title: "Production" },
            { url: service.staging_url, color: "bg-blue-500", title: "Staging" },
            { url: service.figma_url, color: "bg-purple-500", title: "Figma" },
            { url: service.jira_epic ? `https://mumz.atlassian.net/browse/${service.jira_epic}` : null, color: "bg-[var(--mw-navy)]", title: "Jira" },
          ].filter(l => l.url)

          return (
            <Card
              key={service.id}
              className="cursor-pointer hover:shadow-md hover:border-[var(--mw-pink)]/30 transition-all group"
              onClick={() => openServicePanel(service)}
            >
              <CardContent className="p-5 space-y-3">
                {/* Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--mw-text-primary)] group-hover:text-[var(--mw-navy)] transition-colors">{service.name}</h3>
                    <p className="text-sm text-[var(--mw-text-secondary)] mt-0.5 line-clamp-1">{service.description}</p>
                  </div>
                  <Badge className={cn("shrink-0", platformCfg.color)}>
                    <PlatformIcon className="w-3 h-3 mr-1" />{platformCfg.label}
                  </Badge>
                </div>

                {/* Regions + Design Status */}
                <div className="flex items-center gap-3 flex-wrap">
                  {service.regions.map(r => (
                    <Badge key={r} className="bg-gray-100 text-gray-600">
                      <MapPin className="w-3 h-3 mr-1" />{r}
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--mw-text-secondary)]">
                    <span className={cn("w-2 h-2 rounded-full", designCfg.dot)} />
                    Design: {designCfg.label}
                  </div>
                </div>

                {/* Quick Links + Click hint */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickLinks.map(link => (
                    <span key={link.title} className={cn("w-2 h-2 rounded-full", link.color)} title={link.title} />
                  ))}
                  <span className="text-xs text-[var(--mw-text-secondary)] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3 inline mr-0.5" />Click for details
                  </span>
                </div>

                {/* Progress bar */}
                {totalCount > 0 && (
                  <div>
                    <StackedBar
                      segments={[
                        { value: doneCount, color: "#0d9488", label: "Done" },
                        { value: inProgressCount, color: "#3b82f6", label: "In Progress" },
                        { value: blockedCount, color: "#ef4444", label: "Blocked" },
                        { value: notStartedCount, color: "#e5e7eb", label: "Not Started" },
                      ]}
                    />
                    <div className="flex gap-4 text-[10px] text-[var(--mw-text-secondary)] mt-1.5">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />{doneCount} done</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{inProgressCount} active</span>
                      {blockedCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{blockedCount} blocked</span>}
                      <span className="ml-auto font-semibold">{pct}%</span>
                    </div>
                  </div>
                )}

                {/* Owners */}
                <div className="flex items-center gap-4 text-xs text-[var(--mw-text-secondary)]">
                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />Tech: <strong className="text-[var(--mw-text-primary)]">{service.tech_owner}</strong></span>
                  <span className="inline-flex items-center gap-1"><Palette className="w-3 h-3" />Biz: <strong className="text-[var(--mw-text-primary)]">{service.business_owner}</strong></span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12 text-[var(--mw-text-secondary)]">No services match your search</div>
      )}

      {/* Item detail panel */}
      <ItemDetailPanel
        item={panelItem}
        open={panelOpen}
        onClose={closeItemPanel}
        onUpdate={handleItemUpdate}
      />

      {/* Service detail panel */}
      <ServiceDetailPanel
        service={servicePanel}
        open={servicePanelOpen}
        onClose={closeServicePanel}
        tasks={servicePanel ? (serviceItemsMap[servicePanel.id] || []) : []}
        onTaskClick={(item) => { closeServicePanel(); setTimeout(() => openItemPanel(item), 350) }}
        lastMeetingDate={lastMeetingDate}
      />
    </>
  )
}
