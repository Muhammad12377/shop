export function splitColors(value: string): string[] {
  if (!value) return []
  return value
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean)
}

export function colorBackground(value: string): string {
  const colors = splitColors(value)
  if (colors.length <= 1) return colors[0] || "#ffffff"
  const stops = colors.map((c, i) => {
    const from = (i / colors.length) * 100
    const to = ((i + 1) / colors.length) * 100
    return `${c} ${from}% ${to}%`
  })
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

export function colorLabel(value: string): string {
  const colors = splitColors(value)
  if (colors.length <= 1) return colors[0] || ""
  return colors.join(" + ")
}

export function combineColors(values: string[]): string {
  return values.filter(Boolean).join("|")
}
