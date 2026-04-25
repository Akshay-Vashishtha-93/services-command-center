// Seed script — populates Supabase with real Mumzworld Services data
// Run: node scripts/seed-db.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dir = dirname(fileURLToPath(import.meta.url))

const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env.local"), "utf8")
    .split("\n").filter(l => l.includes("="))
    .map(l => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

function uid() { return crypto.randomUUID() }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString() }

// Real team:
// Ranwa = brand (Passant Sherif / Ranwa El Hakim)
// Mustafa = tech (Mustafa Mohamed)
// Mudasir = design (Mudasir Wali)
// Ayhan = design (Ayhan Gümüşalan)
// Shady = ops (Shady Elgendy)
// Akshay = product (Akshay Vashishtha)
// Mahak = product head

const items = [
  // ── Babysitter / Nanny ──────────────────────────────────────────────────────
  { num:"SE-1",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:'Update "Trusted by Mumzworld moms" text',           details:"Update trusted text and banner copy on babysitter/nanny landing page" },
  { num:"SE-2",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:'Write "Tailored care" section copy',                 details:"Write copy for tailored care section on babysitter landing page" },
  { num:"SE-3",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:'Add data for "Moment for every mom" section',        details:"Add content/data for the moment for every mom section" },
  { num:"SE-4",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"in_progress", pri:"medium", eta:"2026-04-24",   owner:"Ranwa",   title:"Images and icons to be shared for babysitter",       details:"Source and share images and icons needed for babysitter page" },
  { num:"SE-5",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"in_progress", pri:"medium", eta:"2026-04-24",   owner:"Ranwa",   title:"Review content (EN + Arabic) for babysitter",        details:"Review and finalise English and Arabic content for babysitter page" },
  { num:"SE-6",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"tech",     status:"in_progress", pri:"high",   eta:"2026-04-24",   owner:"Mustafa", title:"Babysitter: Dev + Launch new design",                details:"Development and launch of babysitter page new design" },
  { num:"SE-7",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:"Send design and details for babysitter with Mudasir", details:"Coordinate design handoff between brand and design team" },
  { num:"SE-8",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"design",   status:"done",        pri:null,     eta:null,           owner:"Mudasir", title:"Incorporate 4 USPs and design FAQ section",          details:"Incorporate the 4 USPs and design the FAQ section on babysitter page" },
  { num:"SE-9",  cat:"Babysitter/Nanny", slug:"babysitter-nanny", ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:"Review final combined babysitter design",             details:"Final review of combined babysitter page design" },

  // ── Birthday / Party ────────────────────────────────────────────────────────
  { num:"SE-10", cat:"Birthday/Party",   slug:"birthday-party",   ws:"design",   status:"in_progress", pri:"high",   eta:"2026-05-01",   owner:"Ayhan",   title:"Move packages section to top of birthday page",      details:"Redesign birthday page to surface packages at the top" },
  { num:"SE-11", cat:"Birthday/Party",   slug:"birthday-party",   ws:"tech",     status:"in_progress", pri:"medium", eta:"2026-04-30",   owner:"Mustafa", title:"Add WhatsApp icon on birthday page",                 details:"Add WhatsApp contact icon to birthday service page" },
  { num:"SE-12", cat:"Birthday/Party",   slug:"birthday-party",   ws:"design",   status:"in_progress", pri:"medium", eta:"2026-05-05",   owner:"Ayhan",   title:"Side-by-side package comparison design",             details:"Design side-by-side comparison view for birthday packages" },
  { num:"SE-13", cat:"Birthday/Party",   slug:"birthday-party",   ws:"tech",     status:"in_progress", pri:"medium", eta:"2026-05-01",   owner:"Mustafa", title:"Add edit button for birthday packages",              details:"Allow users to edit/configure birthday packages" },
  { num:"SE-14", cat:"Birthday/Party",   slug:"birthday-party",   ws:"design",   status:"not_started", pri:"low",    eta:"2026-06-01",   owner:"Ayhan",   title:"Photo carousel for birthday page",                   details:"Add photo carousel to birthday service page" },
  { num:"SE-15", cat:"Birthday/Party",   slug:"birthday-party",   ws:"design",   status:"not_started", pri:"low",    eta:"2026-06-01",   owner:"Ayhan",   title:"Group comparison for birthday packages",              details:"Design group/tier comparison section for birthday packages" },
  { num:"SE-16", cat:"Birthday/Party",   slug:"birthday-party",   ws:"brand",    status:"not_started", pri:"medium", eta:"2026-05-20",   owner:"Ranwa",   title:"Instagram social proof on birthday page",             details:"Add Instagram testimonials and social proof section to birthday page" },
  { num:"SE-17", cat:"Birthday/Party",   slug:"birthday-party",   ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:"FAQ content for birthday page",                      details:"Write and publish FAQ section for birthday service" },
  { num:"SE-18", cat:"Birthday/Party",   slug:"birthday-party",   ws:"tech",     status:"done",        pri:null,     eta:null,           owner:"Mustafa", title:"Birthday/Party KSA configuration",                   details:"Configure birthday/party service for KSA region" },

  // ── Kids Interior ───────────────────────────────────────────────────────────
  { num:"SE-19", cat:"Kids Interior",    slug:"kids-interior",    ws:"tech",     status:"in_progress", pri:"high",   eta:"2026-05-10",   owner:"Mustafa", title:"Dev + Launch kids interior page",                    details:"Development and launch of kids interior service page" },
  { num:"SE-20", cat:"Kids Interior",    slug:"kids-interior",    ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:"AR/3D visualiser copy for kids interior",            details:"Write copy for AR and 3D visualiser sections on kids interior page" },
  { num:"SE-21", cat:"Kids Interior",    slug:"kids-interior",    ws:"brand",    status:"done",        pri:null,     eta:null,           owner:"Ranwa",   title:"Content review for kids interior page",              details:"Full content review for kids interior service page" },
  { num:"SE-22", cat:"Kids Interior",    slug:"kids-interior",    ws:"design",   status:"done",        pri:null,     eta:null,           owner:"Mudasir", title:"Share design link for kids interior",                details:"Share finalized design link with stakeholders" },

  // ── Wallpaper ───────────────────────────────────────────────────────────────
  { num:"SE-23", cat:"Wallpaper",        slug:"wallpaper",        ws:"design",   status:"not_started", pri:"high",   eta:"2026-06-01",   owner:"Ayhan",   title:"Rework landing page for wallpaper",                  details:"Full redesign of wallpaper service landing page" },
  { num:"SE-24", cat:"Wallpaper",        slug:"wallpaper",        ws:"tech",     status:"not_started", pri:"medium", eta:"2026-07-01",   owner:"Mustafa", title:"3D visualization for wallpaper",                     details:"Implement 3D room visualiser for wallpaper products" },
  { num:"SE-25", cat:"Wallpaper",        slug:"wallpaper",        ws:"design",   status:"not_started", pri:"low",    eta:"2026-06-15",   owner:"Ayhan",   title:"Nursery sections for wallpaper page",                details:"Add nursery-themed sections to wallpaper page" },
  { num:"SE-26", cat:"Wallpaper",        slug:"wallpaper",        ws:"tech",     status:"in_progress", pri:"high",   eta:"2026-04-30",   owner:"Mustafa", title:"KSA configuration for wallpaper",                    details:"Configure wallpaper service for KSA region" },

  // ── HealthyHome ─────────────────────────────────────────────────────────────
  { num:"SE-27", cat:"HealthyHome",      slug:"healthyhome",      ws:"tech",     status:"in_progress", pri:"high",   eta:"2026-04-30",   owner:"Mustafa", title:"KSA configuration for HealthyHome",                  details:"Configure HealthyHome service for KSA region" },
  { num:"SE-28", cat:"HealthyHome",      slug:"healthyhome",      ws:"strategy", status:"in_progress", pri:"high",   eta:"2026-05-15",   owner:"Akshay",  title:"HealthyHome merge strategy discussion",               details:"Strategy discussion for HealthyHome service merge/consolidation" },
  { num:"SE-29", cat:"HealthyHome",      slug:"healthyhome",      ws:"design",   status:"in_progress", pri:"medium", eta:"2026-04-30",   owner:"Mudasir", title:"Fix thumbnails for HealthyHome service",              details:"Fix and update service thumbnails for HealthyHome" },
  { num:"SE-30", cat:"HealthyHome",      slug:"healthyhome",      ws:"design",   status:"done",        pri:null,     eta:null,           owner:"Ayhan",   title:"Hero banner for HealthyHome",                        details:"Design and publish hero banner for HealthyHome service page" },

  // ── Midwife ─────────────────────────────────────────────────────────────────
  { num:"SE-31", cat:"Midwife",          slug:"midwife",          ws:"design",   status:"in_progress", pri:"high",   eta:"2026-05-15",   owner:"Ayhan",   title:"Design midwife service page",                        details:"Full design of new midwife service page" },

  // ── Tutor at Home ───────────────────────────────────────────────────────────
  { num:"SE-32", cat:"Tutor at Home",    slug:"tutor-at-home",    ws:"tech",     status:"done",        pri:null,     eta:null,           owner:"Mustafa", title:"Go live — tutor at home service",                    details:"Launch tutor at home service on platform" },

  // ── Home Cleaning ───────────────────────────────────────────────────────────
  { num:"SE-33", cat:"Home Cleaning",    slug:"home-cleaning",    ws:"design",   status:"done",        pri:null,     eta:null,           owner:"Mudasir", title:"Hero banner for home cleaning",                      details:"Design and publish hero banner for home cleaning service" },

  // ── Gear Refresh ────────────────────────────────────────────────────────────
  { num:"SE-34", cat:"Gear Refresh",     slug:"gear-refresh",     ws:"design",   status:"done",        pri:null,     eta:null,           owner:"Mudasir", title:"Hero banner for gear refresh",                       details:"Design and publish hero banner for gear refresh service" },

  // ── General ─────────────────────────────────────────────────────────────────
  { num:"SE-35", cat:"General",          slug:"general",          ws:"tech",     status:"not_started", pri:"medium", eta:"2026-06-01",   owner:"Mustafa", title:"GA tracking for all services",                       details:"Implement Google Analytics tracking across all service pages" },
].map(i => ({
  id: uid(),
  item_number: i.num,
  title: i.title,
  category_name: i.cat,
  category_slug: i.slug,
  workstream: i.ws,
  owner_name: i.owner,
  owner_secondary_name: null,
  status: i.status,
  priority: i.pri,
  eta: i.eta,
  actual_end_date: null,
  source: "Services Enhancement",
  sprint: null,
  remarks: null,
  details: i.details || null,
  expected_impact: null,
  sheet_tab: "Services Enhancement",
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))

// ── Weekly changes (real — based on Apr 22 status updates) ────────────────────

const changes = [
  { item_title: "Babysitter: Dev + Launch new design",        category_name: "Babysitter/Nanny", workstream: "tech",     field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(3) },
  { item_title: "Images and icons to be shared for babysitter", category_name: "Babysitter/Nanny", workstream: "brand",  field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(3) },
  { item_title: "Review content (EN + Arabic) for babysitter",  category_name: "Babysitter/Nanny", workstream: "brand",  field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(3) },
  { item_title: "KSA configuration for wallpaper",            category_name: "Wallpaper",        workstream: "tech",     field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(4) },
  { item_title: "KSA configuration for HealthyHome",          category_name: "HealthyHome",      workstream: "tech",     field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(4) },
  { item_title: "Hero banner for HealthyHome",                category_name: "HealthyHome",      workstream: "design",   field_changed: "status", old_value: "in_progress", new_value: "done",        changed_at: daysAgo(5) },
  { item_title: "Birthday/Party KSA configuration",           category_name: "Birthday/Party",   workstream: "tech",     field_changed: "status", old_value: "in_progress", new_value: "done",        changed_at: daysAgo(5) },
].map(c => ({ id: uid(), item_id: "", ...c }))

// ── Meetings (real team, fixed attendees) ──────────────────────────────────────

const m1 = uid(), m2 = uid()

const meetings = [
  {
    id: m1,
    title: "Services Weekly Sync — Apr 14",
    date: "2026-04-14",
    transcript: "",
    attendees: ["Akshay", "Mustafa", "Ranwa", "Ayhan", "Shady"],
    created_at: "2026-04-14T10:00:00.000Z",
  },
  {
    id: m2,
    title: "Services Weekly Sync — Apr 21",
    date: "2026-04-21",
    transcript: "",
    attendees: ["Akshay", "Mustafa", "Ranwa", "Ayhan", "Shady", "Mahak"],
    created_at: "2026-04-21T10:00:00.000Z",
  },
]

const decisions = [
  { id: uid(), meeting_id: m1, text: "Babysitter redesign to be dev-complete by Apr 24 — Mustafa to lead", status: "aligned" },
  { id: uid(), meeting_id: m1, text: "KSA configuration to be prioritised across Wallpaper and HealthyHome this sprint", status: "aligned" },
  { id: uid(), meeting_id: m1, text: "Midwife service page design to start immediately — Ayhan to own", status: "needs_discussion" },
  { id: uid(), meeting_id: m2, text: "Birthday package comparison design approved — moving to dev handoff", status: "aligned" },
  { id: uid(), meeting_id: m2, text: "HealthyHome merge strategy to be finalised by May 15 — Akshay to document", status: "aligned" },
  { id: uid(), meeting_id: m2, text: "GA tracking to be included in all new service launches as a checklist item", status: "aligned" },
  { id: uid(), meeting_id: m2, text: "3D visualizer for Wallpaper — deprioritise to Q3, revisit in June planning", status: "needs_discussion" },
]

const actionItems = [
  { id: uid(), meeting_id: m1, title: "Complete babysitter dev sprint",              description: "Dev + launch babysitter redesign by Apr 24",                                    owner: "Mustafa", status: "added_to_tracker", category_suggestion: "Babysitter/Nanny" },
  { id: uid(), meeting_id: m1, title: "Configure Wallpaper for KSA",                 description: "KSA region configuration for wallpaper service",                                owner: "Mustafa", status: "accepted",         category_suggestion: "Wallpaper" },
  { id: uid(), meeting_id: m1, title: "Start Midwife page design",                   description: "Full design of midwife service page — high priority",                           owner: "Ayhan",   status: "added_to_tracker", category_suggestion: "Midwife" },
  { id: uid(), meeting_id: m2, title: "Birthday package comparison — dev handoff",   description: "Hand off approved design to Mustafa for development",                           owner: "Ayhan",   status: "pending",          category_suggestion: "Birthday/Party" },
  { id: uid(), meeting_id: m2, title: "HealthyHome merge strategy doc",              description: "Document merge/consolidation options with a clear recommendation for Mahak",    owner: "Akshay",  status: "pending",          category_suggestion: "HealthyHome" },
  { id: uid(), meeting_id: m2, title: "Add GA tracking to service launch checklist", description: "Include GA tracking in all new service go-live checklists — Mustafa to action", owner: "Mustafa", status: "pending",          category_suggestion: "General" },
]

// ── Insert ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Supabase with real Mumzworld Services data...")

  // Clear existing
  await supabase.from("meeting_action_items").delete().neq("id", "x")
  await supabase.from("meeting_decisions").delete().neq("id", "x")
  await supabase.from("meetings").delete().neq("id", "x")
  await supabase.from("changes").delete().neq("id", "x")
  await supabase.from("items").delete().neq("id", "x")

  const { error: ie } = await supabase.from("items").insert(items)
  if (ie) { console.error("items error:", ie.message); process.exit(1) }
  console.log(`OK ${items.length} items (SE-1 to SE-35)`)

  const { error: ce } = await supabase.from("changes").insert(changes)
  if (ce) { console.error("changes error:", ce.message); process.exit(1) }
  console.log(`OK ${changes.length} weekly changes`)

  const { error: me } = await supabase.from("meetings").insert(meetings)
  if (me) { console.error("meetings error:", me.message); process.exit(1) }
  console.log(`OK ${meetings.length} meetings`)

  const { error: de } = await supabase.from("meeting_decisions").insert(decisions)
  if (de) { console.error("decisions error:", de.message); process.exit(1) }
  console.log(`OK ${decisions.length} decisions`)

  const { error: ae } = await supabase.from("meeting_action_items").insert(actionItems)
  if (ae) { console.error("action items error:", ae.message); process.exit(1) }
  console.log(`OK ${actionItems.length} action items`)

  console.log("\nDone — real data is live in Supabase.")
}

seed()
