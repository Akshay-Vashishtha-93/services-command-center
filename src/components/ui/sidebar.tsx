'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Presentation,
  StickyNote,
  Columns2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meetings", href: "/meetings", icon: MessageSquare },
  { label: "Weekly Charter", href: "/presentation", icon: Presentation },
  { label: "Updates", href: "/updates", icon: StickyNote },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Design Compare", href: "/design-compare", icon: Columns2 },
  { label: "Admin", href: "/admin", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--mw-navy)] text-white flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-[var(--mw-pink)]" />
          <span className="font-bold text-sm">SCC</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-[var(--mw-navy-light)] transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out nav */}
      <div
        className={cn(
          "lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-[var(--mw-navy)] text-white transform transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-col gap-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white border-l-3 border-[var(--mw-pink)]"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-[var(--mw-pink)]")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-[var(--mw-navy)] text-white">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
          <LayoutDashboard className="h-6 w-6 text-[var(--mw-pink)]" />
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-tight">Services</span>
            <span className="text-xs text-[var(--mw-pink)] font-medium tracking-wide">Command Center</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-[var(--mw-pink)]")} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--mw-pink)]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--mw-pink)] animate-pulse" />
            <span className="text-xs text-white/50 font-medium">Mumzworld Services</span>
          </div>
        </div>
      </aside>
    </>
  )
}
