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
