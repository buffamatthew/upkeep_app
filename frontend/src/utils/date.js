/**
 * Parse a date string as local time.
 * Date-only strings like "2026-03-09" are treated as UTC by JS,
 * which shifts the displayed date in timezones west of UTC.
 * Appending T00:00:00 forces local-time interpretation.
 */
export function parseLocalDate(dateString) {
  if (!dateString) return new Date(NaN)
  if (dateString.length === 10) {
    return new Date(dateString + 'T00:00:00')
  }
  return new Date(dateString)
}
