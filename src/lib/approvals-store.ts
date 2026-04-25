// Approvals store - tracks flagged updates from external sources
// that need manual review before being applied to the tracker

export type ApprovalItem = {
  id: string
  source: 'slack' | 'email' | 'meeting' | 'manual'
  source_detail: string
  type: 'status_change' | 'new_item' | 'eta_change' | 'conflict' | 'info_update'
  title: string
  description: string
  related_item_id: string | null
  related_item_title: string | null
  related_category: string | null
  suggested_action: string | null
  status: 'pending' | 'approved' | 'dismissed'
  detected_at: string
  resolved_at: string | null
}

let approvals: ApprovalItem[] = []
let initialized = false

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function initializeApprovals() {
  if (initialized) return
  initialized = true

  // Seed with realistic flagged items based on real Slack/email activity
  const now = new Date()
  const daysAgo = (d: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    return date.toISOString()
  }

  approvals = [
    {
      id: generateId(),
      source: 'slack',
      source_detail: '#proj-services-for-mumz - Mustafa mentioned wallpaper AUH expansion timeline',
      type: 'eta_change',
      title: 'Wallpaper AUH Expansion - Timeline Update',
      description: 'Mustafa mentioned in Slack that wallpaper AUH expansion is targeting end of May instead of mid-April. This conflicts with the current ETA in the tracker.',
      related_item_id: null,
      related_item_title: 'Wallpaper - AUH city expansion',
      related_category: 'Wallpaper',
      suggested_action: 'Update ETA from Apr 30 to May 31',
      status: 'pending',
      detected_at: daysAgo(1),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'slack',
      source_detail: '#proj-services-for-mumz - Shady shared nanny KSA update',
      type: 'status_change',
      title: 'Nanny KSA Launch - Ready for Go-Live',
      description: 'Shady confirmed in Slack that nanny service KSA setup is complete and ready for go-live pending Massi approval.',
      related_item_id: null,
      related_item_title: 'KSA babysitter service launch',
      related_category: 'Babysitter/Nanny',
      suggested_action: 'Update status from "in_progress" to "done" or "awaiting_approval"',
      status: 'pending',
      detected_at: daysAgo(1),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'email',
      source_detail: 'Weekly Services Update email from Akshay',
      type: 'info_update',
      title: 'Kids Interior - Awaiting Massi Approval',
      description: 'Weekly update email indicates Kids Interior/Nursery Room service content is complete and Strapi URLs are ready, awaiting final Massi approval for go-live.',
      related_item_id: null,
      related_item_title: 'Kids Interior Nursery Room',
      related_category: 'Kids Interior Design',
      suggested_action: 'Update status to reflect "awaiting approval" state',
      status: 'pending',
      detected_at: daysAgo(2),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'meeting',
      source_detail: 'Weekly Services Charter - Apr 22, 2026',
      type: 'conflict',
      title: 'Birthday Party - Package Visibility Conflict',
      description: 'Meeting decision says to make packages visible on the landing page, but current tracker item says "Design finalized". Design may need update for package display.',
      related_item_id: null,
      related_item_title: 'Birthday party packages redesign',
      related_category: 'Birthday/Party Planning',
      suggested_action: 'Re-open design item or create new task for package visibility',
      status: 'pending',
      detected_at: daysAgo(3),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'slack',
      source_detail: '#proj-services-for-mumz - Passant requested wallpaper size specs',
      type: 'new_item',
      title: 'Wallpaper Size Specifications - New Task',
      description: 'Passant needs exact wallpaper size specifications documented. Mudasir was asked to walk her through sizes. This may need a new tracker item.',
      related_item_id: null,
      related_item_title: null,
      related_category: 'Wallpaper',
      suggested_action: 'Create new item: "Document wallpaper size specifications for Passant"',
      status: 'pending',
      detected_at: daysAgo(2),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'slack',
      source_detail: '#proj-services-for-mumz - Ranwa design feedback',
      type: 'info_update',
      title: 'Babysitter Design - Ranwa Modifications',
      description: 'Ranwa provided design modification feedback for babysitter service. New Figma updates are being incorporated.',
      related_item_id: null,
      related_item_title: 'Babysitter landing page redesign',
      related_category: 'Babysitter/Nanny',
      suggested_action: 'Update design status to "in_progress" if not already',
      status: 'pending',
      detected_at: daysAgo(4),
      resolved_at: null,
    },
    {
      id: generateId(),
      source: 'email',
      source_detail: 'Services Financial Dashboard - Sabeur',
      type: 'status_change',
      title: 'Financial Dashboard - New Filters Added',
      description: 'Sabeur deployed new date range and service category filters to the financial dashboard. Tracker item may need status update.',
      related_item_id: null,
      related_item_title: 'Financial dashboard enhancement',
      related_category: 'General Platform',
      suggested_action: 'Mark related tracker items as "done"',
      status: 'approved',
      detected_at: daysAgo(5),
      resolved_at: daysAgo(4),
    },
  ]
}

export function getAllApprovals(): ApprovalItem[] {
  initializeApprovals()
  return approvals.sort((a, b) =>
    new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  )
}

export function getPendingApprovals(): ApprovalItem[] {
  initializeApprovals()
  return approvals
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
}

export function resolveApproval(id: string, status: 'approved' | 'dismissed'): ApprovalItem | undefined {
  initializeApprovals()
  const item = approvals.find(a => a.id === id)
  if (!item) return undefined
  item.status = status
  item.resolved_at = new Date().toISOString()
  return item
}

export function addApproval(data: Omit<ApprovalItem, 'id' | 'detected_at' | 'resolved_at' | 'status'>): ApprovalItem {
  initializeApprovals()
  const item: ApprovalItem = {
    ...data,
    id: generateId(),
    status: 'pending',
    detected_at: new Date().toISOString(),
    resolved_at: null,
  }
  approvals.push(item)
  return item
}
