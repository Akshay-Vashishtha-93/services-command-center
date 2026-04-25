"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle, PauseCircle, BarChart3, TrendingUp } from "lucide-react"

type Stats = {
  total: number
  done: number
  in_progress: number
  not_started: number
  blocked: number
  overdue: number
  due_this_week: number
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    total: 0, done: 0, in_progress: 0, not_started: 0, blocked: 0, overdue: 0, due_this_week: 0
  })

  useEffect(() => {
    fetch("/api/items/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const active = stats.total - stats.done
  const onTrackPct = active > 0 ? Math.round(((active - stats.overdue - stats.blocked) / active) * 100) : 100

  const cards = [
    {
      label: "Total Active",
      value: active,
      icon: BarChart3,
      color: "text-[var(--mw-navy)]",
      iconBg: "bg-blue-50",
      accentBorder: "border-l-[var(--mw-navy)]",
    },
    {
      label: "In Progress",
      value: stats.in_progress,
      icon: TrendingUp,
      color: "text-[var(--mw-pink)]",
      iconBg: "bg-[var(--mw-pink-light)]",
      accentBorder: "border-l-[var(--mw-pink)]",
    },
    {
      label: "Completed",
      value: stats.done,
      icon: CheckCircle2,
      color: "text-[var(--mw-teal)]",
      iconBg: "bg-[var(--mw-teal-light)]",
      accentBorder: "border-l-[var(--mw-teal)]",
    },
    {
      label: "Not Started",
      value: stats.not_started,
      icon: Clock,
      color: "text-[var(--mw-text-secondary)]",
      iconBg: "bg-gray-100",
      accentBorder: "border-l-gray-300",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "text-[var(--mw-coral)]",
      iconBg: "bg-[var(--mw-coral-light)]",
      accentBorder: "border-l-[var(--mw-coral)]",
    },
    {
      label: "On Track",
      value: `${onTrackPct}%`,
      subValue: onTrackPct >= 70 ? "Healthy" : "Needs attention",
      icon: PauseCircle,
      color: onTrackPct >= 70 ? "text-[var(--mw-teal)]" : "text-[var(--mw-coral)]",
      iconBg: onTrackPct >= 70 ? "bg-[var(--mw-teal-light)]" : "bg-[var(--mw-coral-light)]",
      accentBorder: onTrackPct >= 70 ? "border-l-[var(--mw-teal)]" : "border-l-[var(--mw-coral)]",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(card => (
        <Card key={card.label} className="overflow-hidden border-l-4" style={{ borderLeftColor: "inherit" }}>
          <div className="border-l-4" style={{ borderLeftColor: "var(--mw-card-border)" }}>
            <CardContent className="py-4 px-4 relative">
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">{card.label}</p>
                  <p className={`text-3xl font-bold mt-1 tabular-nums ${card.color}`}>{card.value}</p>
                  {"subValue" in card && card.subValue && (
                    <p className={`text-[10px] mt-0.5 font-medium ${card.color}`}>{card.subValue}</p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  )
}
