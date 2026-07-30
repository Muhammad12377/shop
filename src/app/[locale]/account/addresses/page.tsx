"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { MapPin, Plus, Edit2, Trash2, Star, X } from "lucide-react"
import type { Address } from "@/types"

export default function AddressesPage() {
  const t = useTranslations("account")
  const ct = useTranslations("common")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    label: "",
    full_name: "",
    phone: "",
    address: "",
    city: "",
    is_default: false,
  })
  const locale = useLocale()
  const isRtl = locale === "ar"

  const fetchAddresses = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
    setAddresses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAddresses() }, [])

  const openAdd = () => {
    setEditingAddress(null)
    setForm({ label: "", full_name: "", phone: "", address: "", city: "", is_default: false })
    setShowModal(true)
  }

  const openEdit = (addr: Address) => {
    setEditingAddress(addr)
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      is_default: addr.is_default,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not logged in"); setSaving(false); return }

    if (editingAddress) {
      const { error } = await supabase
        .from("addresses")
        .update(form)
        .eq("id", editingAddress.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success("Address updated")
    } else {
      const { error } = await supabase
        .from("addresses")
        .insert({ ...form, user_id: user.id })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success("Address added")
    }
    setShowModal(false)
    setSaving(false)
    fetchAddresses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(ct("delete"))) return
    const supabase = createClient()
    const { error } = await supabase.from("addresses").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Address deleted")
    fetchAddresses()
  }

  const setDefault = async (id: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id)
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success("Default address set")
    fetchAddresses()
  }

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{t("addresses")}</h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("add_address")}
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 mb-4">
            <MapPin className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-zinc-500 text-sm">{t("no_addresses")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-2xl border border-zinc-100 p-5 relative">
              {addr.is_default && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium">
                  <Star className="w-3 h-3 fill-accent" />
                  {isRtl ? "افتراضي" : "Default"}
                </span>
              )}
              <div className="mb-3">
                <span className="text-xs font-medium text-zinc-400 uppercase">{addr.label}</span>
              </div>
              <div className="text-sm space-y-1 text-zinc-600 mb-4">
                <p className="font-medium text-zinc-800">{addr.full_name}</p>
                <p>{addr.phone}</p>
                <p>{addr.address}</p>
                <p>{addr.city}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => openEdit(addr)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  {ct("edit")}
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    <Star className="w-3 h-3" />
                    {t("set_default")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  {ct("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingAddress ? t("edit_address") : t("add_address")}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("address_label")}</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => updateForm("label", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  placeholder={isRtl ? "منزل، عمل..." : "Home, Work..."}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("full_name")}</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateForm("full_name", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("phone")}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("address")}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("city")}</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={form.is_default}
                  onChange={(e) => updateForm("is_default", e.target.checked)}
                  className="rounded border-zinc-300 text-accent focus:ring-accent"
                />
                <label htmlFor="is_default" className="text-sm">{t("set_default")}</label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? ct("loading") : ct("save")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
