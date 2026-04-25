import { NextRequest, NextResponse } from "next/server"
import { addItem } from "@/lib/data-store"
import { getMeeting, updateActionItemStatus } from "@/lib/meetings-store"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const meeting = getMeeting(id)
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  const body = await request.json()
  const {
    title,
    category_name,
    category_slug,
    owner_name,
    priority,
    eta,
    details,
    meeting_id,
    action_item_id,
  } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const newItem = addItem({
    item_number: null,
    title,
    category_name: category_name || "Uncategorized",
    category_slug: category_slug || "uncategorized",
    workstream: null,
    owner_name: owner_name || null,
    owner_secondary_name: null,
    status: "not_started",
    priority: priority || null,
    eta: eta || null,
    actual_end_date: null,
    source: `meeting:${meeting_id || id}`,
    sprint: null,
    remarks: null,
    details: details || null,
    expected_impact: null,
    sheet_tab: null,
    is_archived: false,
  })

  // Mark the action item as added to tracker
  if (action_item_id) {
    updateActionItemStatus(id, action_item_id, "added_to_tracker")
  }

  return NextResponse.json(newItem, { status: 201 })
}
