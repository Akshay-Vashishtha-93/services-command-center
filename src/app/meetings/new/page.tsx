"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  ArrowLeft,
  Link2,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type InputTab = "paste" | "gdocs" | "upload"

export default function NewMeetingPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [attendees, setAttendees] = useState("")
  const [transcript, setTranscript] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<InputTab>("paste")
  const [gdocsUrl, setGdocsUrl] = useState("")
  const [fetchingDoc, setFetchingDoc] = useState(false)
  const [fetchSuccess, setFetchSuccess] = useState(false)

  // Detect transcript sections
  const sections = {
    summary: /###?\s*summary/i.test(transcript),
    decisions: /###?\s*decisions?/i.test(transcript),
    actionItems: /###?\s*(next\s*steps?|action\s*items?)/i.test(transcript),
    details: /###?\s*details?/i.test(transcript),
  }
  const detectedCount = Object.values(sections).filter(Boolean).length
  const charCount = transcript.length

  async function fetchGoogleDoc() {
    if (!gdocsUrl.trim()) return
    setFetchingDoc(true)
    setError(null)
    setFetchSuccess(false)
    try {
      const res = await fetch("/api/meetings/fetch-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gdocsUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(data.content)
      if (!title && data.title) setTitle(data.title)
      setFetchSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch document")
    } finally {
      setFetchingDoc(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        setTranscript(content)
        if (!title) {
          const firstLine = content.split("\n").find((l) => l.trim())
          if (firstLine) setTitle(firstLine.trim().replace(/^#+\s*/, ""))
        }
      }
      reader.readAsText(file)
    } else {
      setError("Currently supports .txt and .md files. For .docx, paste the Google Docs link instead.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !date.trim()) {
      setError("Title and date are required.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: date.trim(),
          transcript: transcript.trim(),
          attendees: attendees.split(",").map((a) => a.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create meeting")
      }
      const meeting = await res.json()
      router.push(`/meetings/${meeting.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  const tabs: { id: InputTab; label: string; icon: typeof FileText }[] = [
    { id: "paste", label: "Paste Text", icon: ClipboardPaste },
    { id: "gdocs", label: "Google Docs Link", icon: Link2 },
    { id: "upload", label: "Upload File", icon: Upload },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm text-[var(--mw-text-secondary)] hover:text-[var(--mw-navy)] mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Meetings
        </Link>
        <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Add Meeting</h1>
        <p className="text-sm text-[var(--mw-text-secondary)] mt-1">
          Paste transcript, link a Google Doc, or upload a file to extract decisions and action items
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-[var(--mw-coral-light)] border border-[var(--mw-coral)]/30 px-4 py-3 text-sm text-[var(--mw-coral)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {/* Title + Date row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--mw-text-primary)] mb-1">Meeting Title</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Services Sync"
                  className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-[var(--mw-text-primary)] mb-1">Date</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
              </div>
            </div>

            {/* Attendees */}
            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-[var(--mw-text-primary)] mb-1">Attendees</label>
              <input id="attendees" type="text" value={attendees} onChange={(e) => setAttendees(e.target.value)}
                placeholder="Akshay, Shady, Mustafa, Mahak"
                className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
              <p className="text-xs text-[var(--mw-text-secondary)] mt-1">Comma-separated names</p>
            </div>

            {/* Input Method Tabs */}
            <div>
              <label className="block text-sm font-medium text-[var(--mw-text-primary)] mb-2">
                <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />Meeting Notes / Transcript</span>
              </label>
              <div className="flex border-b border-[var(--mw-card-border)]">
                {tabs.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                      activeTab === tab.id
                        ? "border-[var(--mw-pink)] text-[var(--mw-pink)]"
                        : "border-transparent text-[var(--mw-text-secondary)] hover:text-[var(--mw-text-primary)]"
                    )}>
                    <tab.icon className="w-4 h-4" />{tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {/* Paste Tab */}
                {activeTab === "paste" && (
                  <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the full Gemini meeting transcript here..."
                    rows={14}
                    className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
                )}

                {/* Google Docs Tab */}
                {activeTab === "gdocs" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input type="url" value={gdocsUrl} onChange={(e) => { setGdocsUrl(e.target.value); setFetchSuccess(false) }}
                        placeholder="https://docs.google.com/document/d/..."
                        className="flex-1 rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
                      <button type="button" onClick={fetchGoogleDoc} disabled={fetchingDoc || !gdocsUrl.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--mw-navy)] text-white text-sm font-medium hover:bg-[var(--mw-navy-light)] disabled:opacity-50 transition">
                        {fetchingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        {fetchingDoc ? "Fetching..." : "Fetch Document"}
                      </button>
                    </div>
                    {fetchSuccess && (
                      <div className="flex items-center gap-2 text-sm text-[var(--mw-teal)]">
                        <CheckCircle2 className="w-4 h-4" />Document loaded successfully
                      </div>
                    )}
                    <p className="text-xs text-[var(--mw-text-secondary)]">
                      Document must be shared with &quot;Anyone with the link can view&quot;
                    </p>
                    {transcript && activeTab === "gdocs" && (
                      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={10}
                        className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
                    )}
                  </div>
                )}

                {/* Upload Tab */}
                {activeTab === "upload" && (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--mw-card-border)] rounded-xl cursor-pointer hover:border-[var(--mw-pink)] hover:bg-[var(--mw-pink-light)]/30 transition">
                      <Upload className="w-6 h-6 text-[var(--mw-text-secondary)] mb-2" />
                      <span className="text-sm text-[var(--mw-text-secondary)]">Click to upload .txt or .md file</span>
                      <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {transcript && activeTab === "upload" && (
                      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={10}
                        className="w-full rounded-xl border border-[var(--mw-card-border)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Preview */}
            {transcript && (
              <div className="rounded-xl bg-[var(--mw-bg)] border border-[var(--mw-card-border)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase">Content Preview</span>
                  <Badge className="bg-[var(--mw-teal-light)] text-[var(--mw-teal)]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Ready to parse
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--mw-text-secondary)]">
                  <span>{charCount.toLocaleString()} characters</span>
                  <span>{detectedCount} sections detected:</span>
                  {sections.summary && <Badge className="bg-blue-50 text-blue-600">Summary</Badge>}
                  {sections.decisions && <Badge className="bg-purple-50 text-purple-600">Decisions</Badge>}
                  {sections.actionItems && <Badge className="bg-emerald-50 text-emerald-600">Action Items</Badge>}
                  {sections.details && <Badge className="bg-gray-100 text-gray-600">Details</Badge>}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--mw-pink)] text-white rounded-xl text-sm font-medium hover:bg-[var(--mw-pink-hover)] transition disabled:opacity-50">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Parsing &amp; Creating...</> : "Parse & Create Meeting"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
