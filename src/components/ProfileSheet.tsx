"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase-config"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetCloseButton } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/context/ToastContext"

export function ProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [initialName, setInitialName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const changed = fullName.trim() !== initialName.trim()
  const valid = fullName.trim().length >= 2 && fullName.trim().length <= 50

  useEffect(() => {
    if (!open) return

    (async () => {
      setLoading(true)
      setError(null)

      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData?.user) {
        setError("No se pudo obtener el usuario.")
        setLoading(false)
        return
      }

      const user = authData.user
      setEmail(user.email ?? "")

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()

      if (profErr) {
        setError("No se pudo cargar el perfil.")
        setLoading(false)
        return
      }

      const name = (profile?.full_name ?? "").toString()
      setFullName(name)
      setInitialName(name)
      setLoading(false)
    })()
  }, [open, supabase])

  async function onSave() {
    setError(null)
    const name = fullName.trim()

    if (!valid) {
      setError("El nombre debe tener entre 2 y 50 caracteres.")
      return
    }

    setSaving(true)

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) {
      setError("Sesión inválida.")
      setSaving(false)
      return
    }

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: name }, { onConflict: "id" })

    if (upsertErr) {
      setError("No se pudo guardar el nombre.")
      setSaving(false)
      return
    }

    setInitialName(name)
    setSaving(false)
    onOpenChange(false)
    showToast("Nombre actualizado", "success")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px]">
        <SheetHeader>
          <SheetCloseButton onClose={() => onOpenChange(false)} />
          <SheetTitle>Perfil</SheetTitle>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-text)' }}>Actualiza tu nombre para mostrar</p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input value={email} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Nombre para mostrar</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: John Smith"
              disabled={loading}
            />
            <p className="text-xs" style={{ color: 'var(--muted-text)' }}>Este nombre se mostrará en la app.</p>
            {error && <p className="text-sm" style={{ color: 'var(--error-text)' }}>{error}</p>}
          </div>
        </div>

        <SheetFooter className="mt-8">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={loading || saving || !changed || !valid}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

