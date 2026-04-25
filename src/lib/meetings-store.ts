import { parseTranscript, suggestCategory } from "@/lib/transcript-parser"

export type Meeting = {
  id: string
  title: string
  date: string
  transcript: string
  attendees: string[]
  created_at: string
}

export type MeetingDecision = {
  id: string
  meeting_id: string
  text: string
  status: 'aligned' | 'needs_discussion'
}

export type MeetingActionItem = {
  id: string
  meeting_id: string
  title: string
  description: string
  owner: string
  status: 'pending' | 'accepted' | 'skipped' | 'added_to_tracker'
  category_suggestion: string | null
}

const SEED_MEETINGS: Array<Meeting & { seedDecisions: MeetingDecision[]; seedActions: MeetingActionItem[] }> = [
  {
    id: "seed-meeting-1",
    title: "Services Weekly Sync — Apr 14",
    date: "2026-04-14",
    transcript: "",
    attendees: ["Akshay", "Khalid", "Nada", "Sara"],
    created_at: "2026-04-14T10:00:00.000Z",
    seedDecisions: [
      { id: "sd1-1", meeting_id: "seed-meeting-1", text: "Babysitter service landing page to be redesigned with new brand guidelines", status: "aligned" },
      { id: "sd1-2", meeting_id: "seed-meeting-1", text: "Payment gateway integration for vendor tools — Stripe preferred", status: "aligned" },
      { id: "sd1-3", meeting_id: "seed-meeting-1", text: "Wallpaper service SEO audit to be completed before May launch", status: "needs_discussion" },
    ],
    seedActions: [
      { id: "sa1-1", meeting_id: "seed-meeting-1", title: "Finalize Babysitter landing page design", description: "New layout with Figma handoff to dev by Apr 18", owner: "Nada", status: "accepted", category_suggestion: "Babysitter" },
      { id: "sa1-2", meeting_id: "seed-meeting-1", title: "Set up Stripe vendor payment flow", description: "Integrate payment link generator in repository tool", owner: "Khalid", status: "pending", category_suggestion: "Vendor Tools" },
      { id: "sa1-3", meeting_id: "seed-meeting-1", title: "SEO audit — Wallpaper service", description: "Keyword research + page speed report", owner: "Sara", status: "pending", category_suggestion: "Wallpaper" },
    ],
  },
  {
    id: "seed-meeting-2",
    title: "Services Weekly Sync — Apr 21",
    date: "2026-04-21",
    transcript: "",
    attendees: ["Akshay", "Khalid", "Nada", "Omar"],
    created_at: "2026-04-21T10:00:00.000Z",
    seedDecisions: [
      { id: "sd2-1", meeting_id: "seed-meeting-2", text: "Babysitter landing page design approved — move to development sprint", status: "aligned" },
      { id: "sd2-2", meeting_id: "seed-meeting-2", text: "Vendor payment tool go-live target set for May 5", status: "aligned" },
      { id: "sd2-3", meeting_id: "seed-meeting-2", text: "Add Gifting service tracking to the PMO dashboard", status: "aligned" },
      { id: "sd2-4", meeting_id: "seed-meeting-2", text: "App rating push campaign — timing still under review", status: "needs_discussion" },
    ],
    seedActions: [
      { id: "sa2-1", meeting_id: "seed-meeting-2", title: "Start Babysitter dev sprint", description: "Frontend implementation based on approved Figma", owner: "Khalid", status: "pending", category_suggestion: "Babysitter" },
      { id: "sa2-2", meeting_id: "seed-meeting-2", title: "Gifting service — add to tracker sheet", description: "Create line items in Services Enhancement tab", owner: "Akshay", status: "added_to_tracker", category_suggestion: "Gifting" },
      { id: "sa2-3", meeting_id: "seed-meeting-2", title: "App rating campaign brief", description: "Draft campaign plan with timing options", owner: "Omar", status: "pending", category_suggestion: "App" },
    ],
  },
]

let meetings: Meeting[] = SEED_MEETINGS.map(({ seedDecisions: _, seedActions: __, ...m }) => m)
let decisions: MeetingDecision[] = SEED_MEETINGS.flatMap(m => m.seedDecisions)
let actionItems: MeetingActionItem[] = SEED_MEETINGS.flatMap(m => m.seedActions)

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function getAllMeetings(): Meeting[] {
  return meetings.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getMeeting(id: string): Meeting | undefined {
  return meetings.find((m) => m.id === id)
}

export function createMeeting(data: {
  title: string
  date: string
  transcript: string
  attendees: string[]
}): Meeting {
  const id = generateId()
  const meeting: Meeting = {
    id,
    title: data.title,
    date: data.date,
    transcript: data.transcript,
    attendees: data.attendees,
    created_at: new Date().toISOString(),
  }
  meetings.push(meeting)

  // Parse transcript if provided
  if (data.transcript.trim()) {
    const parsed = parseTranscript(data.transcript)

    for (const d of parsed.decisions) {
      decisions.push({
        id: generateId(),
        meeting_id: id,
        text: d.text,
        status: d.alignment,
      })
    }

    for (const a of parsed.actionItems) {
      const combinedText = `${a.title} ${a.description}`
      actionItems.push({
        id: generateId(),
        meeting_id: id,
        title: a.title,
        description: a.description,
        owner: a.owners.join(', '),
        status: 'pending',
        category_suggestion: suggestCategory(combinedText),
      })
    }
  }

  return meeting
}

export function updateActionItemStatus(
  meetingId: string,
  actionItemId: string,
  status: MeetingActionItem['status']
): MeetingActionItem | undefined {
  const item = actionItems.find(
    (a) => a.id === actionItemId && a.meeting_id === meetingId
  )
  if (!item) return undefined
  item.status = status
  return item
}

export function getMeetingActionItems(meetingId: string): MeetingActionItem[] {
  return actionItems.filter((a) => a.meeting_id === meetingId)
}

export function getMeetingDecisions(meetingId: string): MeetingDecision[] {
  return decisions.filter((d) => d.meeting_id === meetingId)
}
