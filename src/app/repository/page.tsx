"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getRepositoryData, type ServiceEntry } from "@/lib/repository-data"
import {
  Globe,
  ExternalLink,
  PenLine,
  TicketCheck,
  Palette,
  Users,
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  FlaskConical,
  Rocket,
  PenTool,
  Clock,
  CreditCard,
  Link2,
  X,
  Eye,
  Layers,
} from "lucide-react"

const CATEGORY_CONFIG = {
  for_your_little_ones: { label: "For Your Little Ones", color: "bg-[var(--mw-pink-light)] text-[var(--mw-pink)]", icon: "👶" },
  mumz_support: { label: "Mumz Support", color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]", icon: "🏠" },
  mumz_health: { label: "Mumz Health", color: "bg-blue-50 text-blue-700", icon: "🩺" },
  tools: { label: "Tools & Platforms", color: "bg-[var(--mw-purple-light)] text-[var(--mw-purple)]", icon: "🛠" },
}

const STATUS_CONFIG = {
  live: { label: "Live", color: "bg-emerald-100 text-emerald-700", icon: Rocket },
  staging: { label: "Staging", color: "bg-blue-100 text-blue-700", icon: FlaskConical },
  in_design: { label: "In Design", color: "bg-purple-100 text-purple-700", icon: PenTool },
  planned: { label: "Planned", color: "bg-gray-100 text-gray-600", icon: Clock },
  ksa_expansion: { label: "KSA Expansion", color: "bg-amber-100 text-amber-700", icon: MapPin },
}

const DESIGN_STATUS = {
  finalized: { label: "Finalized", dot: "bg-emerald-500" },
  in_progress: { label: "In Progress", dot: "bg-amber-500" },
  not_started: { label: "Not Started", dot: "bg-gray-400" },
  needs_update: { label: "Needs Update", dot: "bg-red-500" },
}

export default function RepositoryPage() {
  const services = getRepositoryData()
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterRegion, setFilterRegion] = useState<string>("")
  const [selectedService, setSelectedService] = useState<ServiceEntry | null>(null)

  const filtered = services.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && s.category !== filterCategory) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (filterRegion && !s.regions.includes(filterRegion)) return false
    return true
  })

  const liveCount = services.filter(s => s.status === "live").length
  const stagingCount = services.filter(s => s.status === "staging").length
  const plannedCount = services.filter(s => s.status === "planned" || s.status === "in_design").length
  const regionCount = new Set(services.flatMap(s => s.regions)).size

  const grouped: Record<string, ServiceEntry[]> = {}
  filtered.forEach(s => {
    const cat = s.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Services Repository</h1>
          <p className="text-[var(--mw-text-secondary)] text-sm mt-1">Complete reference for all Mumzworld services — click any service for full details</p>
        </div>
        <Badge className="bg-[var(--mw-navy)]/10 text-[var(--mw-navy)] px-3 py-1.5">
          <Layers className="w-3.5 h-3.5 mr-1" />{services.length} Services
        </Badge>
      </div>

      {/* Visual Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Live", value: liveCount, icon: Rocket, bg: "bg-emerald-100", color: "text-emerald-600", pct: Math.round((liveCount / services.length) * 100) },
          { label: "In Staging", value: stagingCount, icon: FlaskConical, bg: "bg-blue-100", color: "text-blue-600", pct: Math.round((stagingCount / services.length) * 100) },
          { label: "Planned", value: plannedCount, icon: Clock, bg: "bg-gray-100", color: "text-gray-600", pct: Math.round((plannedCount / services.length) * 100) },
          { label: "Regions", value: regionCount, icon: MapPin, bg: "bg-amber-100", color: "text-amber-600", pct: 100 },
        ].map(card => (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-[var(--mw-text-primary)]">{card.value}</p>
                  <p className="text-xs text-[var(--mw-text-secondary)]">{card.label}</p>
                </div>
                <div className={cn("p-2.5 rounded-xl", card.bg)}>
                  <card.icon className={cn("w-5 h-5", card.color)} />
                </div>
              </div>
              {card.label !== "Regions" && (
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", card.bg.replace('100', '500'))} style={{ width: `${card.pct}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--mw-text-secondary)]" />
          <input type="text" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-[var(--mw-card-border)] rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
        </div>
        {/* Category pills */}
        <div className="flex items-center gap-1">
          <button onClick={() => setFilterCategory("")}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              !filterCategory ? "bg-[var(--mw-navy)] text-white" : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
            All
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCategory(filterCategory === k ? "" : k)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                filterCategory === k ? cn(v.color, "ring-1 ring-current") : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        {/* Status pills */}
        <div className="flex items-center gap-1">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
              className={cn("px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                filterStatus === k ? cn(v.color, "ring-1 ring-current") : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
              {v.label}
            </button>
          ))}
        </div>
        {/* Region pills */}
        <div className="flex items-center gap-1">
          {["UAE", "KSA"].map(r => (
            <button key={r} onClick={() => setFilterRegion(filterRegion === r ? "" : r)}
              className={cn("px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                filterRegion === r ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
              <MapPin className="w-3 h-3 inline mr-0.5" />{r}
            </button>
          ))}
        </div>
      </div>

      {/* Service Cards by Category */}
      {Object.entries(grouped).map(([category, catServices]) => {
        const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{config.icon}</span>
              <h2 className="text-lg font-bold text-[var(--mw-navy)]">{config.label}</h2>
              <Badge className={config.color}>{catServices.length}</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {catServices.map(service => {
                const statusCfg = STATUS_CONFIG[service.status]
                const designCfg = DESIGN_STATUS[service.design_status]

                return (
                  <Card key={service.id}
                    className="cursor-pointer hover:shadow-md hover:border-[var(--mw-pink)]/30 transition-all group"
                    onClick={() => setSelectedService(service)}>
                    <CardContent className="p-5 space-y-3">
                      {/* Name + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[var(--mw-text-primary)] group-hover:text-[var(--mw-navy)] transition-colors">{service.name}</h3>
                          <p className="text-sm text-[var(--mw-text-secondary)] mt-0.5">{service.description}</p>
                        </div>
                        <Badge className={cn("shrink-0", statusCfg.color)}>
                          <statusCfg.icon className="w-3 h-3 mr-1" />{statusCfg.label}
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
                        {service.launch_date && (
                          <span className="text-xs text-[var(--mw-text-secondary)]">Launched: {service.launch_date}</span>
                        )}
                      </div>

                      {/* Quick Links Row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {service.production_url && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Has production URL" />}
                        {service.staging_url && <span className="w-2 h-2 rounded-full bg-blue-500" title="Has staging URL" />}
                        {service.figma_url && <span className="w-2 h-2 rounded-full bg-purple-500" title="Has Figma link" />}
                        {service.jira_epic && <span className="w-2 h-2 rounded-full bg-[var(--mw-navy)]" title="Has Jira epic" />}
                        {service.vendor_tool_url && <span className="w-2 h-2 rounded-full bg-amber-500" title="Has vendor tool" />}
                        <span className="text-xs text-[var(--mw-text-secondary)] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3 h-3 inline mr-0.5" />Click for details
                        </span>
                      </div>

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
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--mw-text-secondary)]">No services match your filters</div>
      )}

      {/* Slide-out Detail Panel */}
      {selectedService && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedService(null)} />
          <ServiceDetailPanel service={selectedService} onClose={() => setSelectedService(null)} />
        </>
      )}
    </div>
  )
}

function ServiceDetailPanel({ service, onClose }: { service: ServiceEntry, onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[service.status]
  const designCfg = DESIGN_STATUS[service.design_status]
  const catCfg = CATEGORY_CONFIG[service.category]

  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="sticky top-0 bg-[var(--mw-navy)] text-white p-6 z-10">
        <div className="flex items-start justify-between">
          <div>
            <Badge className={cn("mb-2", catCfg.color)}>{catCfg.icon} {catCfg.label}</Badge>
            <h2 className="text-xl font-bold">{service.name}</h2>
            <p className="text-white/70 text-sm mt-1">{service.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Badge className={cn(statusCfg.color)}>
            <statusCfg.icon className="w-3 h-3 mr-1" />{statusCfg.label}
          </Badge>
          {service.regions.map(r => (
            <Badge key={r} className="bg-white/20 text-white">
              <MapPin className="w-3 h-3 mr-1" />{r}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Design Status */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3">Design Status</h3>
          <div className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full", designCfg.dot)} />
            <span className="text-sm font-medium text-[var(--mw-text-primary)]">{designCfg.label}</span>
          </div>
        </div>

        {/* Links Section */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3">Links & Resources</h3>
          <div className="space-y-2">
            {service.production_url && (
              <a href={service.production_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-emerald-300 hover:bg-emerald-50/50 transition group">
                <div className="p-2 rounded-lg bg-emerald-100"><Globe className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Production</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.production_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.production_url_ar && (
              <a href={service.production_url_ar} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-emerald-300 hover:bg-emerald-50/50 transition group">
                <div className="p-2 rounded-lg bg-emerald-100"><Globe className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Production (Arabic)</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.production_url_ar}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.staging_url && (
              <a href={service.staging_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-blue-300 hover:bg-blue-50/50 transition group">
                <div className="p-2 rounded-lg bg-blue-100"><FlaskConical className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Staging</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.staging_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.staging_url_ar && (
              <a href={service.staging_url_ar} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-blue-300 hover:bg-blue-50/50 transition group">
                <div className="p-2 rounded-lg bg-blue-100"><FlaskConical className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Staging (Arabic)</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.staging_url_ar}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.figma_url && (
              <a href={service.figma_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-purple-300 hover:bg-purple-50/50 transition group">
                <div className="p-2 rounded-lg bg-purple-100"><PenLine className="w-4 h-4 text-purple-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Figma Design</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.figma_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.jira_epic && (
              <a href={`https://mumz.atlassian.net/browse/${service.jira_epic}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-[var(--mw-navy)]/30 hover:bg-blue-50/50 transition group">
                <div className="p-2 rounded-lg bg-[var(--mw-navy)]/10"><TicketCheck className="w-4 h-4 text-[var(--mw-navy)]" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Jira Epic</p>
                  <p className="text-xs text-[var(--mw-text-secondary)]">{service.jira_epic}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
            {service.vendor_tool_url && (
              <a href={service.vendor_tool_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--mw-card-border)] hover:border-amber-300 hover:bg-amber-50/50 transition group">
                <div className="p-2 rounded-lg bg-amber-100"><CreditCard className="w-4 h-4 text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--mw-text-primary)]">Vendor Payment Tool</p>
                  <p className="text-xs text-[var(--mw-text-secondary)] truncate">{service.vendor_tool_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--mw-text-secondary)] opacity-0 group-hover:opacity-100 transition" />
              </a>
            )}
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
  )
}
