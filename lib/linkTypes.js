export const LINK_TYPE_LABELS = {
  figma: 'Figma',
  gdoc: 'Google Doc',
  sheet: 'Excel / Sheet',
  pdf: 'PDF',
  apk: 'APK',
  other: 'Other',
}

export const LINK_TYPE_OPTIONS = Object.entries(LINK_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const URL_GUESSES = [
  [/figma\.com/i, 'figma'],
  [/docs\.google\.com\/document/i, 'gdoc'],
  [/docs\.google\.com\/spreadsheets/i, 'sheet'],
  [/sheets\.google\.com|\.xlsx?$/i, 'sheet'],
  [/\.pdf($|\?)/i, 'pdf'],
  [/\.apk($|\?)/i, 'apk'],
]

export function guessLinkType(url) {
  const match = URL_GUESSES.find(([pattern]) => pattern.test(url))
  return match ? match[1] : 'other'
}
