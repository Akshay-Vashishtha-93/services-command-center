import { NextRequest, NextResponse } from "next/server"
import {
  getMeeting,
  getMeetingActionItems,
  getMeetingDecisions,
  updateActionItemStatus,
} from "@/lib/meetings-store"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const meeting = getMeeting(id)
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const actionItems = getMeetingActionItems(id)
  const decisions = getMeetingDecisions(id)

  return NextResponse.json({
    ...meeting,
    action_items: actionItems,
    decisions,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const meeting = getMeeting(id)
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()

  // Support updating action item statuses
  if (body.action_item_id && body.status) {
    const updated = updateActionItemStatus(id, body.action_item_id, body.status)
    if (!updated) {
      return NextResponse.json(
        { error: "Action item not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Invalid update" }, { status: 400 })
}
