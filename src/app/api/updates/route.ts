import { NextRequest, NextResponse } from "next/server"
import { dbGetAllItems, dbUpdateItem } from "@/lib/db"

/**
 * Natural language update processor.
 * Takes a text instruction and matches it to items, then applies updates.
 * No LLM needed — uses keyword matching and fuzzy search.
 */
export async function POST(request: NextRequest) {
  const { instruction } = await request.json()
  if (!instruction || typeof instruction !== "string") {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 })
  }

  const items = await dbGetAllItems("Services Enhancement")
  const text = instruction.toLowerCase().trim()

  // Parse the instruction into intent
  const result = parseAndApply(text, items)

  if (result.matches.length === 0) {
    return NextResponse.json({
      status: "no_match",
      message: `Could not find matching items for: "${instruction}"`,
      suggestions: findSuggestions(text, items),
    })
  }

  // Apply updates
  const applied: { id: string; title: string; field: string; old_value: string; new_value: string }[] = []

  for (const match of result.matches) {
    const item = items.find(i => i.id === match.id)
    if (!item) continue

    const updates: Record<string, string | null> = {}
    if (match.newStatus && match.newStatus !== item.status) {
      applied.push({ id: item.id, title: item.title, field: "status", old_value: item.status, new_value: match.newStatus })
      updates.status = match.newStatus
    }
    if (match.newEta !== undefined) {
      applied.push({ id: item.id, title: item.title, field: "eta", old_value: item.eta || "", new_value: match.newEta || "" })
      updates.eta = match.newEta
    }
    if (match.newRemarks !== undefined) {
      applied.push({ id: item.id, title: item.title, field: "remarks", old_value: item.remarks || "", new_value: match.newRemarks })
      updates.remarks = match.newRemarks
    }

    if (Object.keys(updates).length > 0) {
      await dbUpdateItem(item.id, updates)
    }
  }

  return NextResponse.json({
    status: "applied",
    message: `Updated ${applied.length} field(s) across ${result.matches.length} item(s)`,
    changes: applied,
  })
}

type ItemMatch = {
  id: string
  newStatus?: string
  newEta?: string | null
  newRemarks?: string
}

type ParseResult = {
  matches: ItemMatch[]
}

type Item = Awaited<ReturnType<typeof dbGetAllItems>>[0]

function parseAndApply(text: string, items: Item[]): ParseResult {
  // Detect status intent
  const newStatus = detectStatus(text)

  // Detect ETA
  const newEta = detectEta(text)

  // Find matching items
  const matchedItems = findMatchingItems(text, items)

  if (matchedItems.length === 0) return { matches: [] }

  return {
    matches: matchedItems.map(item => ({
      id: item.id,
      newStatus: newStatus || undefined,
      newEta: newEta !== null ? newEta : undefined,
    })),
  }
}

function detectStatus(text: string): string | null {
  // Order matters — check multi-word phrases before single words
  // "not started", "reset", "reopen" — must come before "started"
  if (/\b(not started|not yet started|reset|reopen|reopened)\b/.test(text)) return "not_started"
  // "on hold", "paused", "deferred"
  if (/\b(on hold|paused|deferred|postponed|put on hold)\b/.test(text)) return "on_hold"
  // "went live", "is live", "launched", "completed", "is done", "finished"
  if (/\b(went live|is live|launched|completed|is done|finished|is complete|mark.*done|move.*done)\b/.test(text)) return "done"
  // "blocked", "is stuck", "waiting on"
  if (/\b(blocked|is stuck|stuck on|waiting on|waiting for)\b/.test(text)) return "blocked"
  // "started", "in progress", "working on", "picked up", "began"
  if (/\b(started|in progress|working on|picked up|began|kicked off|is underway)\b/.test(text)) return "in_progress"
  // "delayed"
  if (/\b(delayed|pushed back|slipped)\b/.test(text)) return "delayed"
  // "cancelled", "dropped", "removed"
  if (/\b(cancelled|canceled|dropped|removed|scrapped)\b/.test(text)) return "cancelled"
  return null
}

function detectEta(text: string): string | null | undefined {
  // "by May 15", "eta May 15", "due May 15", "deadline May 15"
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
  const etaMatch = text.match(/(?:by|eta|due|deadline|to|before)\s+([a-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i)
  if (etaMatch) {
    const monthIdx = monthNames.indexOf(etaMatch[1].toLowerCase().slice(0, 3))
    if (monthIdx !== -1) {
      const day = parseInt(etaMatch[2])
      const year = etaMatch[3] ? parseInt(etaMatch[3]) : new Date().getFullYear()
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }
  return undefined // undefined = no ETA change, null would clear it
}

function findMatchingItems(text: string, items: Item[]): Item[] {
  // Service/category keywords
  const serviceKeywords: Record<string, string[]> = {
    "Babysitter/Nanny": ["babysitter", "nanny", "nannies"],
    "Birthday/Party": ["birthday", "party", "party planning"],
    "Kids Interior": ["kids interior", "nursery room", "nursery design"],
    "Wallpaper": ["wallpaper"],
    "HealthyHome": ["healthyhome", "healthy home", "thh", "pest control"],
    "Home Cleaning": ["home cleaning", "cleaning"],
    "Gear Refresh": ["gear refresh", "gear"],
    "Midwife": ["midwife", "breastfeeding", "lactation"],
    "Tutor at Home": ["tutor", "tutoring"],
    "General": ["ga tracking", "analytics", "general"],
  }

  // Check if text mentions a specific item by title keywords
  const titleMatches = items.filter(item => {
    const titleWords = item.title.toLowerCase().split(/\s+/)
    // Check if significant words from the title appear in the text
    const significantWords = titleWords.filter(w => w.length > 3 && !["the", "and", "for", "with", "from", "this", "that", "into"].includes(w))
    const matchCount = significantWords.filter(w => text.includes(w)).length
    return matchCount >= 2 || (significantWords.length <= 2 && matchCount >= 1)
  })

  if (titleMatches.length > 0 && titleMatches.length <= 5) {
    return titleMatches
  }

  // Check if text mentions a service category
  for (const [category, keywords] of Object.entries(serviceKeywords)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        // Match specific items within this category based on additional context
        const categoryItems = items.filter(i => i.category_name === category)

        // If text mentions specific task keywords, narrow down
        const specificMatches = categoryItems.filter(item => {
          const t = item.title.toLowerCase()
          // Check for overlapping keywords between instruction and title
          const words = text.split(/\s+/).filter(w => w.length > 3)
          return words.some(w => t.includes(w) && !keywords.includes(w))
        })

        if (specificMatches.length > 0 && specificMatches.length <= 5) {
          return specificMatches
        }

        // If instruction says "all [service]" or is general about the service
        if (text.includes("all ") || /\b(everything|entire|whole)\b/.test(text)) {
          return categoryItems
        }

        // If just mentioning a service + status, try to match the most relevant item
        // For "went live" type updates, match the main dev/launch item
        if (/\b(went live|launched|is live)\b/.test(text)) {
          const launchItems = categoryItems.filter(i =>
            i.title.toLowerCase().includes("launch") ||
            i.title.toLowerCase().includes("go live") ||
            i.title.toLowerCase().includes("dev")
          )
          if (launchItems.length > 0) return launchItems
        }

        // Default: return active items in this category
        const active = categoryItems.filter(i => i.status !== "done" && i.status !== "cancelled")
        if (active.length > 0 && active.length <= 3) return active

        return categoryItems
      }
    }
  }

  return []
}

function findSuggestions(text: string, items: Item[]): string[] {
  const categories = [...new Set(items.map(i => i.category_name))]
  return [
    "Try mentioning a service name: " + categories.join(", "),
    "Example: 'Babysitter went live'",
    "Example: 'Wallpaper KSA configuration is in progress'",
    "Example: 'Birthday party design is blocked'",
  ]
}
