"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, ListChecks, Plus } from "lucide-react"

type MeetingSummary = {
  id: string
  title: string
  date: string
  attendees: string[]
  created_at: string
  action_items_count: number
  decisions_count: number
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/meetings")
      .then((res) => res.json())
      .then((data) => {
        setMeetings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review meeting transcripts, decisions, and action items
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Meeting
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading meetings...</div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No meetings yet.</p>
            <Link
              href="/meetings/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add your first meeting
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {meeting.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {meeting.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5" />
                          {meeting.action_items_count} action item{meeting.action_items_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {meeting.decisions_count > 0 && (
                        <Badge className="bg-purple-100 text-purple-800">
                          {meeting.decisions_count} decision{meeting.decisions_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {meeting.action_items_count > 0 && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {meeting.action_items_count} action{meeting.action_items_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
