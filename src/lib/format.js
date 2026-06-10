// Artist display names fall back to the login email (e.g. "vincent@alley.local")
// when no explicit name was set. Strip the internal domain for display.
export function formatArtistName(name) {
  if (!name) return ''
  return name.replace(/@alley\.local$/i, '')
}

// Compact date+time for a sale row, e.g. "Jun 10, 14:32".
// Conventions can span multiple days, so we keep the date as well as the time.
export function formatSaleTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
