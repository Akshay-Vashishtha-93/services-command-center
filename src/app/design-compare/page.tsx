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

export default function DesignComparePage() {
  const [figmaInput, setFigmaInput] = useState("")
  const [figmaLoaded, setFigmaLoaded] = useState("")
  const [prodInput, setProdInput] = useState("")
  const [prodLoaded, setProdLoaded] = useState("")

  const loadFigma = () => { if (figmaInput.trim()) setFigmaLoaded(figmaInput.trim()) }
  const loadProd = () => { if (prodInput.trim()) setProdLoaded(prodInput.trim()) }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--mw-bg)]">

      {/* ─── Top bar ─── */}
      <div className="shrink-0 bg-white border-b border-[var(--mw-card-border)] px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Columns2 className="w-5 h-5 text-[var(--mw-pink)]" />
          <h1 className="text-lg font-bold text-[var(--mw-navy)]">Design Compare</h1>
          <span className="text-xs text-[var(--mw-text-secondary)] bg-[var(--mw-bg)] border border-[var(--mw-card-border)] px-2 py-0.5 rounded-full ml-1">
            Figma · Production mweb
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Figma URL */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider mb-1.5 block">
              Figma Prototype URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={figmaInput}
                onChange={e => setFigmaInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadFigma()}
                placeholder="https://www.figma.com/proto/..."
                className="flex-1 text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
              />
              <button
                onClick={loadFigma}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition",
                  figmaInput.trim()
                    ? "bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy)]/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
                disabled={!figmaInput.trim()}
              >
                Load
              </button>
            </div>
          </div>

          {/* Production URL */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider mb-1.5 block">
              Production URL (mweb)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={prodInput}
                onChange={e => setProdInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadProd()}
                placeholder="https://mumzworld.com/..."
                className="flex-1 text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] bg-white"
              />
              <button
                onClick={loadProd}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition",
                  prodInput.trim()
                    ? "bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy)]/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
                disabled={!prodInput.trim()}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Panels ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Figma */}
        <div className="flex-1 flex flex-col border-r border-[var(--mw-card-border)] overflow-hidden">
          <div className="shrink-0 px-4 py-2 bg-white border-b border-[var(--mw-card-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">Figma Prototype</span>
            </div>
            <div className="flex items-center gap-2">
              {figmaLoaded && (
                <>
                  <button
                    onClick={() => { setFigmaLoaded(""); setFigmaInput("") }}
                    className="text-xs text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)] flex items-center gap-1 transition"
                    title="Clear"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear
                  </button>
                  <a
                    href={figmaLoaded}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--mw-navy)] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in Figma
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[#f5f5f5]">
            {figmaLoaded ? (
              <iframe
                key={figmaLoaded}
                src={toFigmaEmbed(figmaLoaded)}
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
                  <p className="text-xs mt-1 text-[var(--mw-text-secondary)]/70">Paste a Figma prototype or design URL above and click Load</p>
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
            <div className="flex items-center gap-2">
              {prodLoaded && (
                <>
                  <button
                    onClick={() => { setProdLoaded(""); setProdInput("") }}
                    className="text-xs text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)] flex items-center gap-1 transition"
                    title="Clear"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear
                  </button>
                  <a
                    href={prodLoaded}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--mw-navy)] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in browser
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center py-6 px-4">
            {prodLoaded ? (
              <div className="flex flex-col items-center gap-3">
                {/* Phone frame */}
                <div
                  className="relative shadow-2xl"
                  style={{
                    background: "#1c1c1e",
                    borderRadius: 54,
                    padding: "14px 14px",
                    width: 430,
                    flexShrink: 0,
                  }}
                >
                  {/* Dynamic island / notch */}
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 120,
                      height: 34,
                      background: "#1c1c1e",
                      borderRadius: 20,
                      zIndex: 10,
                    }}
                  />
                  {/* Screen area */}
                  <div
                    style={{
                      borderRadius: 44,
                      overflow: "hidden",
                      background: "#fff",
                      height: "calc(100vh - 260px)",
                      minHeight: 580,
                    }}
                  >
                    <iframe
                      key={prodLoaded}
                      src={prodLoaded}
                      style={{
                        width: 402,
                        height: "100%",
                        border: "none",
                        display: "block",
                      }}
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
                  <p className="text-xs mt-1 text-[var(--mw-text-secondary)]/70">Paste a live URL above and click Load</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
