export const PHONE_CODES = [
  { code: "+963", en: "Syria", ar: "سوريا" },
  { code: "+966", en: "Saudi Arabia", ar: "السعودية" },
  { code: "+971", en: "UAE", ar: "الإمارات" },
  { code: "+962", en: "Jordan", ar: "الأردن" },
  { code: "+964", en: "Iraq", ar: "العراق" },
  { code: "+965", en: "Kuwait", ar: "الكويت" },
  { code: "+973", en: "Bahrain", ar: "البحرين" },
  { code: "+974", en: "Qatar", ar: "قطر" },
  { code: "+968", en: "Oman", ar: "عُمان" },
  { code: "+970", en: "Palestine", ar: "فلسطين" },
  { code: "+961", en: "Lebanon", ar: "لبنان" },
  { code: "+20", en: "Egypt", ar: "مصر" },
  { code: "+90", en: "Turkey", ar: "تركيا" },
  { code: "+1", en: "United States", ar: "الولايات المتحدة" },
  { code: "+44", en: "United Kingdom", ar: "بريطانيا" },
  { code: "+49", en: "Germany", ar: "ألمانيا" },
  { code: "+33", en: "France", ar: "فرنسا" },
]

export function splitPhone(phone: string): { code: string; number: string } {
  const match = phone.match(/^(\+\d{1,3})(.*)$/)
  return match ? { code: match[1], number: match[2] } : { code: "+963", number: phone }
}

export const PHONE_LENGTHS: Record<string, number> = {
  "+963": 9,
  "+966": 9,
  "+971": 9,
  "+962": 9,
  "+964": 10,
  "+965": 8,
  "+973": 8,
  "+974": 8,
  "+968": 8,
  "+970": 9,
  "+961": 8,
  "+20": 10,
  "+90": 10,
  "+1": 10,
  "+44": 10,
  "+49": 11,
  "+33": 9,
}

export function validatePhone(
  code: string,
  number: string
): { valid: boolean; error?: "phone_required" | "unknown_code" | "phone_length" | "phone_prefix"; cleaned?: string } {
  const digits = number.replace(/\D/g, "").replace(/^0+/, "")
  if (!digits) return { valid: false, error: "phone_required" }

  const expected = PHONE_LENGTHS[code]
  if (!expected) return { valid: false, error: "unknown_code" }

  if (digits.length !== expected) return { valid: false, error: "phone_length" }

  if (code === "+963" && !digits.startsWith("9")) {
    return { valid: false, error: "phone_prefix" }
  }

  return { valid: true, cleaned: digits }
}
