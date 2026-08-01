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

const COLOR_NAMES: Record<string, { en: string; ar: string }> = {
  "#ffffff": { en: "White", ar: "أبيض" },
  "#f5f5f5": { en: "White", ar: "أبيض" },
  "#f0f8ff": { en: "White", ar: "أبيض" },
  "#000000": { en: "Black", ar: "أسود" },
  "#111111": { en: "Black", ar: "أسود" },
  "#374151": { en: "Dark Gray", ar: "رمادي داكن" },
  "#6b7280": { en: "Gray", ar: "رمادي" },
  "#9ca3af": { en: "Gray", ar: "رمادي" },
  "#808080": { en: "Gray", ar: "رمادي" },
  "#c0c0c0": { en: "Silver", ar: "فضي" },
  "#ef4444": { en: "Red", ar: "أحمر" },
  "#f43f5e": { en: "Rose", ar: "وردي" },
  "#ff0000": { en: "Red", ar: "أحمر" },
  "#800000": { en: "Maroon", ar: "كستنائي" },
  "#a52a2a": { en: "Brown", ar: "بني" },
  "#f97316": { en: "Orange", ar: "برتقالي" },
  "#ffa500": { en: "Orange", ar: "برتقالي" },
  "#f59e0b": { en: "Amber", ar: "كهرماني" },
  "#facc15": { en: "Yellow", ar: "أصفر" },
  "#eab308": { en: "Yellow", ar: "أصفر" },
  "#ffff00": { en: "Yellow", ar: "أصفر" },
  "#ffd700": { en: "Gold", ar: "ذهبي" },
  "#808000": { en: "Olive", ar: "زيتوني" },
  "#a3e635": { en: "Lime", ar: "ليموني" },
  "#22c55e": { en: "Green", ar: "أخضر" },
  "#10b981": { en: "Emerald", ar: "زمردي" },
  "#00ff00": { en: "Green", ar: "أخضر" },
  "#008000": { en: "Green", ar: "أخضر" },
  "#14b8a6": { en: "Teal", ar: "تركوازي" },
  "#008080": { en: "Teal", ar: "تركوازي" },
  "#06b6d4": { en: "Cyan", ar: "سماوي" },
  "#00ffff": { en: "Cyan", ar: "سماوي" },
  "#0ea5e9": { en: "Sky Blue", ar: "أزرق سماوي" },
  "#3b82f6": { en: "Blue", ar: "أزرق" },
  "#0000ff": { en: "Blue", ar: "أزرق" },
  "#000080": { en: "Navy", ar: "كحلي" },
  "#6366f1": { en: "Indigo", ar: "نيلي" },
  "#8b5cf6": { en: "Violet", ar: "بنفسجي" },
  "#a855f7": { en: "Purple", ar: "أرجواني" },
  "#800080": { en: "Purple", ar: "أرجواني" },
  "#d946ef": { en: "Fuchsia", ar: "فوشيا" },
  "#ec4899": { en: "Pink", ar: "وردي" },
  "#ffc0cb": { en: "Pink", ar: "وردي" },
}

export function colorName(value: string, locale: "en" | "ar" = "en"): string {
  const colors = splitColors(value)
  if (colors.length === 0) return ""
  const names = colors.map((c) => {
    let key = c.trim().toLowerCase()
    if (!key.startsWith("#")) key = `#${key}`
    const entry = COLOR_NAMES[key]
    return entry ? entry[locale] : c.trim()
  })
  return names.join(" + ")
}

export function colorLabel(value: string, locale: "en" | "ar" = "en"): string {
  return colorName(value, locale)
}

export function combineColors(values: string[]): string {
  return values.filter(Boolean).join("|")
}
