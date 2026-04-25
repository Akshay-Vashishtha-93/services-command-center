"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { StickyNote, Layers, CheckCircle2, Presentation } from "lucide-react"
import Link from "next/link"

export default function UpdatesPage() {
  const [leadershipNotes, setLeadershipNotes] = useState("")
  const [serviceNotes, setServiceNotes] = useState("")
  const [meetingType, setMeetingType] = useState<"leadership" | "internal">("leadership")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLeadershipNotes(localStorage.getItem("pres-massi-notes") || "")
    setServiceNotes(localStorage.getItem("pres-service-notes") || "")
    setMeetingType(
      (localStorage.getItem("pres-meeting-type") as "leadership" | "internal") || "leadership"
    )
  }, [])

  function save() {
    localStorage.setItem("pres-massi-notes", leadershipNotes)
    localStorage.setItem("pres-service-notes", serviceNotes)
    localStorage.setItem("pres-meeting-type", meetingType)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Manual Updates</h1>
          <p className="text-sm text-[var(--mw-text-secondary)] mt-1">
            Add context notes for leadership or internal meetings. These feed into the weekly slides automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--mw-teal)] font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={save}
            className="px-4 py-2.5 bg-[var(--mw-pink)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--mw-pink-hover)] transition"
          >
            Save Notes
          </button>
        </div>
      </div>

      {/* Meeting type selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--mw-text-secondary)]">Meeting context:</span>
        <div className="flex rounded-xl overflow-hidden border border-[var(--mw-card-border)]">
          <button
            onClick={() => setMeetingType("leadership")}
            className={cn(
              "px-4 py-2 text-xs font-semibold transition-colors",
              meetingType === "leadership"
                ? "bg-[var(--mw-pink)] text-white"
                : "bg-white text-[var(--mw-text-secondary)] hover:bg-gray-50"
            )}
          >
            Leadership Review
          </button>
          <button
            onClick={() => setMeetingType("internal")}
            className={cn(
              "px-4 py-2 text-xs font-semibold transition-colors",
              meetingType === "internal"
                ? "bg-[var(--mw-navy)] text-white"
                : "bg-white text-[var(--mw-text-secondary)] hover:bg-gray-50"
            )}
          >
            Internal Services
          </button>
        </div>
        <Badge className={meetingType === "leadership"
          ? "bg-[var(--mw-pink-light)] text-[var(--mw-pink)]"
          : "bg-[var(--mw-navy)]/10 text-[var(--mw-navy)]"
        }>
          {meetingType === "leadership" ? "Leadership Review" : "Internal Meeting"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leadership meeting notes */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-[var(--mw-pink)]" />
              <span className="font-semibold text-sm text-[var(--mw-text-primary)]">
                {meetingType === "leadership" ? "Leadership Meeting Notes" : "Meeting Notes"}
              </span>
            </div>
            <p className="text-xs mt-1 text-[var(--mw-text-secondary)]">
              {meetingType === "leadership"
                ? "Appears on the Recap slide in the weekly presentation"
                : "Context notes for internal reference"}
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={leadershipNotes}
              onChange={e => setLeadershipNotes(e.target.value)}
              placeholder={meetingType === "leadership"
                ? "Key points discussed, decisions made, context for next meeting..."
                : "Internal discussion notes..."}
              className="w-full h-52 rounded-xl border border-[var(--mw-card-border)] p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] text-[var(--mw-text-primary)]"
            />
          </CardContent>
        </Card>

        {/* Service-specific updates */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--mw-navy)]" />
              <span className="font-semibold text-sm text-[var(--mw-text-primary)]">
                Service Updates
              </span>
            </div>
            <p className="text-xs mt-1 text-[var(--mw-text-secondary)]">
              Service-specific updates to highlight in the weekly slides
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={serviceNotes}
              onChange={e => setServiceNotes(e.target.value)}
              placeholder="e.g. Babysitter: landing page now in dev sprint&#10;Wallpaper: SEO audit delayed to May 7&#10;Gifting: new service added to tracker"
              className="w-full h-52 rounded-xl border border-[var(--mw-card-border)] p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)] text-[var(--mw-text-primary)]"
            />
          </CardContent>
        </Card>
      </div>

      {/* How it feeds into slides */}
      <Card className="bg-[var(--mw-teal-light)]/30 border-[var(--mw-teal)]/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Presentation className="w-5 h-5 text-[var(--mw-teal)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--mw-text-primary)]">How these feed into the slides</p>
              <ul className="mt-1.5 space-y-1 text-xs text-[var(--mw-text-secondary)]">
                <li>• <strong>Leadership notes</strong> appear on the Recap slide when meeting type is set to Leadership Review</li>
                <li>• <strong>Service updates</strong> are shown alongside auto-detected changes from the tracker</li>
                <li>• Notes are auto-saved to your browser and persist across sessions</li>
              </ul>
              <Link href="/presentation" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--mw-teal)] hover:underline">
                <Presentation className="w-4 h-4" />
                View Weekly Slides
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-[var(--mw-text-secondary)]">
        Notes are saved to your browser. To make them available to the team, use the Meetings section to upload a transcript.
      </p>
    </div>
  )
}
