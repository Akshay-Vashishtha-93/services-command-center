"use client"

import { useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import {
  Bell,
  Sheet,
  Calendar,
  Database,
  Download,
  Upload,
  RefreshCw,
  Info,
} from "lucide-react"

type ScheduleRow = {
  channel: string
  messageType: string
  frequency: string
  active: boolean
}

export default function AdminPage() {
  // Notification Settings
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [notifFrequency, setNotifFrequency] = useState("Daily")
  const [slackChannel, setSlackChannel] = useState("#services-command-center")
  const [digestDay, setDigestDay] = useState("Monday")
  const [notifTime, setNotifTime] = useState("09:00")

  // Google Sheets Sync
  const [sheetId, setSheetId] = useState(
    "16NuuihN1xC7LhpParyNHV6tu9PpbJJ_o8guEZpam7v4"
  )
  const [syncDirection, setSyncDirection] = useState("sheet-to-dashboard")
  const [autoSync, setAutoSync] = useState(false)
  const [syncFrequency, setSyncFrequency] = useState("every-15-min")

  // Communication Schedule
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([
    {
      channel: "proj-services",
      messageType: "Weekly Digest",
      frequency: "Every Monday 9am",
      active: true,
    },
    {
      channel: "babysitter-services",
      messageType: "Pending Items Reminder",
      frequency: "Daily 10am",
      active: false,
    },
    {
      channel: "services-command-center",
      messageType: "Overdue Alerts",
      frequency: "Real-time",
      active: true,
    },
  ])

  const toggleScheduleRow = (index: number) => {
    setScheduleRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, active: !row.active } : row
      )
    )
  }

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure notifications, sync, and scheduled communications
        </p>
      </div>

      {/* Local-only banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="h-4 w-4 shrink-0" />
        Settings saved locally (backend coming soon)
      </div>

      {/* 1. Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Settings
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enable Slack */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Enable Slack notifications
              </span>
            </label>

            {/* Notification Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Frequency
              </label>
              <select
                value={notifFrequency}
                onChange={(e) => setNotifFrequency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* Slack Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Channel
              </label>
              <input
                type="text"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="#channel-name"
              />
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Digest Day
              </label>
              <select
                value={digestDay}
                onChange={(e) => setDigestDay(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Time
              </label>
              <input
                type="time"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Google Sheets Sync */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Google Sheets Sync
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sheet ID */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheet ID
              </label>
              <input
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Sync Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Direction
              </label>
              <select
                value={syncDirection}
                onChange={(e) => setSyncDirection(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="sheet-to-dashboard">
                  Sheet &rarr; Dashboard
                </option>
                <option value="dashboard-to-sheet">
                  Dashboard &rarr; Sheet
                </option>
                <option value="two-way">Two-way</option>
              </select>
            </div>

            {/* Sync Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Frequency
              </label>
              <select
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="every-5-min">Every 5 min</option>
                <option value="every-15-min">Every 15 min</option>
                <option value="every-hour">Every hour</option>
                <option value="manual">Manual only</option>
              </select>
            </div>

            {/* Auto-sync toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-sync enabled</span>
            </label>

            {/* Sync Now button */}
            <div className="flex items-end">
              <button
                disabled
                title="Coming Soon"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
                <span className="ml-1 text-xs text-gray-400">(Coming Soon)</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Communication Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Communication Schedule
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Message Type</th>
                  <th className="px-6 py-3 font-medium">Frequency</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Toggle</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, i) => (
                  <tr key={row.channel} className="border-b last:border-b-0">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      #{row.channel}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {row.messageType}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.frequency}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {row.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleScheduleRow(i)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          row.active ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            row.active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Data Management
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <button
              disabled
              title="Coming Soon"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export All Data (CSV)
              <span className="ml-1 text-xs text-gray-400">(Coming Soon)</span>
            </button>
            <button
              disabled
              title="Coming Soon"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <Upload className="h-4 w-4" />
              Import from Sheet
              <span className="ml-1 text-xs text-gray-400">(Coming Soon)</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
