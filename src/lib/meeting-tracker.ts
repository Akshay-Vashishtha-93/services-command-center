import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const SETTINGS_FILE = join(process.cwd(), ".meeting-settings.json")

type MeetingSettings = {
  last_meeting_date: string | null // ISO date, e.g. "2026-04-21"
  next_meeting_date: string | null
}

function readSettings(): MeetingSettings {
  if (!existsSync(SETTINGS_FILE)) {
    return { last_meeting_date: null, next_meeting_date: null }
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"))
  } catch {
    return { last_meeting_date: null, next_meeting_date: null }
  }
}

function writeSettings(settings: MeetingSettings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export function getLastMeetingDate(): string | null {
  return readSettings().last_meeting_date
}

export function setLastMeetingDate(date: string) {
  const settings = readSettings()
  settings.last_meeting_date = date
  writeSettings(settings)
}

export function getMeetingSettings(): MeetingSettings {
  return readSettings()
}

export function updateMeetingSettings(updates: Partial<MeetingSettings>) {
  const settings = readSettings()
  if (updates.last_meeting_date !== undefined) settings.last_meeting_date = updates.last_meeting_date
  if (updates.next_meeting_date !== undefined) settings.next_meeting_date = updates.next_meeting_date
  writeSettings(settings)
}
