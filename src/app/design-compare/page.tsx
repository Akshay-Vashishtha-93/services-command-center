"use client"

import { useState } from "react"
import { Columns2, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

function toFigmaEmbed(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (trimmed.includes("figma.com/embed")) return trimmed
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(trimmed)}`
}

type Slot = {
  label: string
  figmaInput: string
  figmaLoaded: string
  prodInput: string
  prodLoaded: string
}

const INITIAL_SLOTS: [Slot, Slot] = [
  { label: "Service A", figmaInput: "", figmaLoaded: "", prodInput: "", prodLoaded: "" },
  { label: "Service B", figmaInput: "", figmaLoaded: "", prodInput: "", prodLoaded: "" },
]

export default function DesignComparePage() {
  const [slots, setSlots] = useState<[Slot, Slot]>(INITIAL_SLOTS)
  const [active, setActive] = useState<0 | 1>(0)
  const [editingLabel, setEditingLabel] = useState<0 | 1 | null>(null)

  const slot = slots[active]

  function updateSlot(patch: Partial<Slot>) {
    setSlots(prev => {
      const next: [Slot, Slot] = [{ ...prev[0] }, { ...prev[1] }]
      next[active] = { ...next[active], ...patch }
      return next
    })
  }

  const loadFigma = () => {
    if (slot.figmaInput.trim()) updateSlot({ figmaLoaded: slot.figmaInput.trim() })
  }
  const loadProd = () => {
    if (slot.prodInput.trim()) updateSlot({ prodLoaded: slot.prodInput.trim() })
  }

  const slotHasContent = (s: Slot) => !!(s.figmaLoaded || s.prodLoaded)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--mw-bg)]">

      {/* ─── Top bar ─── */}
      <div className="shrink-0 bg-white border-b border-[var(--mw-card-border)] px-6 pt-4 pb-0">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-3">
          <Columns2 className="w-5 h-5 text-[var(--mw-pink)]" />
          <h1 className="text-lg font-bold text-[var(--mw-navy)]">Design Compare</h1>
          <span className="text-xs text-[var(--mw-text-secondary)] bg-[var(--mw-bg)] border border-[var(--mw-card-border)] px-2 py-0.5 rounded-full">
            Figma · Production mweb
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1">
          {([0, 1] as const).map(i => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-colors border-t border-x",
                active === i
                  ? "bg-[var(--mw-bg)] text-[var(--mw-navy)] border-[var(--mw-card-border)] border-b-[var(--mw-bg)] -mb-px z-10"
                  : "bg-white text-[var(--mw-text-secondary)] border-transparent hover:text-[var(--mw-text-primary)]"
              )}
            >
              {editingLabel === i ? (
                <input
                  autoFocus
                  value={slots[i].label}
                  onChange={e => {
                    const val = e.target.value
                    setSlots(prev => {
                      const next: [Slot, Slot] = [{ ...prev[0] }, { ...prev[1] }]
                      next[i] = { ...next[i], label: val }
                      return next
                    })
                  }}
                  onBlur={() => setEditingLabel(null)}
                  onKeyDown={e => e.key === "Enter" && setEditingLabel(null)}
                  className="bg-transparent outline-none w-24 text-center"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span onDoubleClick={e => { e.stopPropagation(); setEditingLabel(i) }}>
                  {slots[i].label}
                </span>
              )}
              {slotHasContent(slots[i]) && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--mw-pink)]" />
              )}
            </button>
          ))}
          <span className="text-xs text-[var(--mw-text-secondary)] ml-2 opacity-60">double-click tab to rename</span>
        </div>
      </div>

      {/* ─── URL inputs for active slot ─── */}
      <div className="shrink-0 bg-[var(--mw-bg)] border-b border-[var(--mw-card-border)] px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Figma */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider mb-1.5 block">
              Figma Prototype URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={slot.figmaInput}
                onChange={e => updateSlot({ figmaInput: e.target.value })}
                onKeyDown={e => e.key === "Enter" && loadFigma()}
                placeholder="https://www.figma.com/proto/..."
                className="flex-1 text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
              />
              <button
                onClick={loadFigma}
                disabled={!slot.figmaInput.trim()}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition",
                  slot.figmaInput.trim()
                    ? "bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy)]/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Load
              </button>
            </div>
          </div>

          {/* Production */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider mb-1.5 block">
              Production URL (mweb)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={slot.prodInput}
                onChange={e => updateSlot({ prodInput: e.target.value })}
                onKeyDown={e => e.key === "Enter" && loadProd()}
                placeholder="https://mumzworld.com/..."
                className="flex-1 text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
              />
              <button
                onClick={loadProd}
                disabled={!slot.prodInput.trim()}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition",
                  slot.prodInput.trim()
                    ? "bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy)]/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Comparison panels ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Figma */}
        <div className="flex-1 flex flex-col border-r border-[var(--mw-card-border)] overflow-hidden">
          <div className="shrink-0 px-4 py-2 bg-white border-b border-[var(--mw-card-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Figma Prototype</span>
            </div>
            {slot.figmaLoaded && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSlot({ figmaLoaded: "", figmaInput: "" })}
                  className="text-xs text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)] flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
                <a
                  href={slot.figmaLoaded}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--mw-navy)] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open in Figma
                </a>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden bg-[#f5f5f5]">
            {slot.figmaLoaded ? (
              <iframe
                key={`${active}-figma-${slot.figmaLoaded}`}
                src={toFigmaEmbed(slot.figmaLoaded)}
                className="w-full h-full border-0"
                allowFullScreen
                allow="fullscreen"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--mw-text-secondary)]">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-purple-200 flex items-center justify-center">
                  <Columns2 className="w-7 h-7 text-purple-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">No Figma prototype loaded</p>
                  <p className="text-xs mt-1 opacity-60">Paste a Figma URL above and click Load</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Production mweb */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 px-4 py-2 bg-white border-b border-[var(--mw-card-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Production · mweb</span>
            </div>
            {slot.prodLoaded && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSlot({ prodLoaded: "", prodInput: "" })}
                  className="text-xs text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)] flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
                <a
                  href={slot.prodLoaded}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--mw-navy)] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open in browser
                </a>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center py-6 px-4">
            {slot.prodLoaded ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative shadow-2xl"
                  style={{ background: "#1c1c1e", borderRadius: 54, padding: 14, width: 430, flexShrink: 0 }}
                >
                  {/* Dynamic island */}
                  <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", width: 120, height: 34, background: "#1c1c1e", borderRadius: 20, zIndex: 10 }} />
                  {/* Screen */}
                  <div style={{ borderRadius: 44, overflow: "hidden", background: "#fff", height: "calc(100vh - 280px)", minHeight: 560 }}>
                    <iframe
                      key={`${active}-prod-${slot.prodLoaded}`}
                      src={slot.prodLoaded}
                      style={{ width: 402, height: "100%", border: "none", display: "block" }}
                      title="Production mweb preview"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">390px mobile view</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--mw-text-secondary)]">
                <div className="w-16 h-28 rounded-2xl bg-white border-2 border-dashed border-emerald-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-300 tracking-wide">mweb</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">No production URL loaded</p>
                  <p className="text-xs mt-1 opacity-60">Paste a live URL above and click Load</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
