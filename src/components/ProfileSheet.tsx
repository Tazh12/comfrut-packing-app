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
  const [avatarColor, setAvatarColor] = useState("#1D6FE3")
  const [initialAvatarColor, setInitialAvatarColor] = useState("#1D6FE3")
  const [error, setError] = useState<string | null>(null)

  const avatarColors = [
    "#1D6FE3", // Blue
    "#0D9488", // Teal
    "#7C3AED", // Purple
    "#16A34A", // Green
    "#F97316", // Orange
    "#DC2626", // Red
    "#4F46E5", // Indigo
    "#DB2777", // Pink
  ]

  const changed = fullName.trim() !== initialName.trim() || avatarColor !== initialAvatarColor
  const valid = fullName.trim().length === 0 || (fullName.trim().length >= 2 && fullName.trim().length <= 50)

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

      // Try to fetch profile with both fields, fallback to just full_name if avatar_color doesn't exist
      let profile: { full_name?: string | null; avatar_color?: string | null } | null = null
      let profErr: any = null

      // First try with both fields
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_color")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        // If error is about missing column, try without avatar_color
        if (profileError.message?.includes('column') || profileError.message?.includes('does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle()
          
          if (!fallbackError) {
            profile = fallbackData
          } else {
            profErr = fallbackError
          }
        } else {
          profErr = profileError
        }
      } else {
        profile = profileData
      }

      // Only show error for critical errors
      if (profErr && profErr.code !== 'PGRST116') {
        console.error("Error loading profile:", profErr)
        // Don't block the user - allow them to still edit and save
      }

      // Handle null/undefined values properly
      const name = profile?.full_name ? profile.full_name.toString() : ""
      const color = profile?.avatar_color ? profile.avatar_color.toString() : "#1D6FE3"
      
      setFullName(name)
      setInitialName(name)
      setAvatarColor(color)
      setInitialAvatarColor(color)
      setError(null) // Clear any previous errors
      setLoading(false)
    })()
  }, [open, supabase])

  async function onSave() {
    setError(null)
    const name = fullName.trim()

    if (name.length > 0 && (name.length < 2 || name.length > 50)) {
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

    // Try to save with avatar_color first
    const { data: savedData, error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: name, avatar_color: avatarColor }, { onConflict: "id" })
      .select()

    // If error is about missing column, try saving without avatar_color
    if (upsertErr && (upsertErr.message?.includes('column') || upsertErr.message?.includes('does not exist') || upsertErr.code === '42703')) {
      console.warn("avatar_color column doesn't exist, saving without it:", upsertErr)
      const { error: fallbackErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: name }, { onConflict: "id" })
      
      if (fallbackErr) {
        console.error("Error saving profile:", fallbackErr)
        setError("No se pudo guardar el perfil.")
        setSaving(false)
        return
      }
      // Successfully saved without avatar_color - show warning
      setInitialName(name)
      setInitialAvatarColor(avatarColor) // Keep the selected color in state even if DB doesn't support it
      setSaving(false)
      onOpenChange(false)
      showToast("Nombre guardado. Ejecuta la migración SQL para guardar el color del avatar.", "warning")
      return
    } else if (upsertErr) {
      console.error("Error saving profile:", upsertErr)
      setError(`No se pudo guardar el perfil: ${upsertErr.message}`)
      setSaving(false)
      return
    }

    // Verify the save was successful
    if (savedData && savedData.length > 0) {
      console.log("Profile saved successfully:", savedData[0])
    }

    setInitialName(name)
    setInitialAvatarColor(avatarColor)
    setSaving(false)
    onOpenChange(false)
    showToast("Perfil actualizado", "success")
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

          <div className="space-y-3">
            <Label>Color del avatar</Label>
            <div className="flex items-center gap-4">
              {/* Preview Circle */}
              <div className="flex-shrink-0">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: avatarColor }}
                >
                  <span className="text-sm font-semibold text-white">
                    {fullName.trim() ? fullName.trim()[0].toUpperCase() : email[0]?.toUpperCase() || "U"}
                  </span>
                </div>
              </div>
              
              {/* Color Picker Grid */}
              <div className="flex-1 grid grid-cols-4 gap-3 justify-items-center">
                {avatarColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    disabled={loading}
                    className="w-10 h-10 rounded-full transition-all hover:opacity-80 hover:scale-110"
                    style={{
                      backgroundColor: color,
                      border: avatarColor === color ? '3px solid var(--input-border-focus)' : '2px solid transparent',
                      boxShadow: avatarColor === color ? '0 0 0 2px var(--card-bg)' : 'none',
                    }}
                    aria-label={`Seleccionar color ${color}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-text)' }}>Selecciona un color para tu avatar.</p>
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

