/**
 * Maps item category_name values (from Google Sheets / Supabase) to repository service IDs.
 * These must match the ACTUAL category_name values in the database exactly.
 */
export const CATEGORY_TO_SERVICE: Record<string, string> = {
  "Babysitter/Nanny": "babysitter-nannies",
  "Birthday/Party": "birthday-party-planning",
  "Wallpaper": "wallpaper-installation",
  "Kids Interior": "kids-interior-nursery",
  "Tutor at Home": "tutor-at-home",
  "Home Cleaning": "home-cleaning",
  "Gear Refresh": "gear-refresh",
  "HealthyHome": "healthy-home",
  "Midwife": "midwife-services",
  "General": "services-landing-page",
}

// Reverse lookup: service ID -> category name(s)
export const SERVICE_TO_CATEGORIES: Record<string, string[]> = {}
for (const [cat, svcId] of Object.entries(CATEGORY_TO_SERVICE)) {
  if (!SERVICE_TO_CATEGORIES[svcId]) SERVICE_TO_CATEGORIES[svcId] = []
  SERVICE_TO_CATEGORIES[svcId].push(cat)
}
