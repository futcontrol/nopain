"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { useToast } from "@/components/ui/use-toast"

type Physio = {
  id: string
  name: string
}

export default function ReservationForm() {
  const params = useParams()
  const clinicId = Array.isArray(params.id) ? params.id[0] : params.id
  const supabase = createClient()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [time, setTime] = useState("")
  const [physios, setPhysios] = useState<Physio[]>([])
  const [selectedPhysio, setSelectedPhysio] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // 🧠 Obtener usuario autenticado
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 🔍 Diagnóstico: mostrar en consola si hay usuario autenticado
      console.log("🧠 Usuario autenticado:", user)

      if (user) {
        setUserEmail(user.email ?? null)
        setUserId(user.id)

        const fallbackName =
          user.user_metadata?.full_name ??
          (user.email ? user.email.split("@")[0] : "Usuario NoPain")

        setUserName(fallbackName)
      } else {
        setUserEmail(null)
        setUserId(null)
        setUserName(null)
      }
    }
    fetchUser()
  }, [supabase])

  // 🩺 Cargar fisioterapeutas de la clínica
  useEffect(() => {
    const fetchPhysios = async () => {
      if (!clinicId) return

      const { data, error } = await supabase
        .from("physiotherapists")
        .select("id, name")
        .eq("clinic_id", clinicId)

      if (error) {
        console.error("❌ Error cargando fisioterapeutas:", error)
      } else {
        setPhysios(data || [])
      }
    }

    fetchPhysios()
  }, [clinicId, supabase])

  // 💾 Crear reserva vinculada al usuario autenticado
  const handleReservation = async () => {
    if (!selectedDate || !time || !selectedPhysio) {
      toast({
        title: "Campos incompletos",
        description: "Selecciona fisioterapeuta, fecha y hora.",
        variant: "destructive",
      })
      return
    }

    if (!userId || !userEmail) {
      toast({
        title: "Inicia sesión para reservar",
        description: "Debes iniciar sesión antes de hacer una reserva.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.from("reservas").insert([
        {
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          clinic_id: clinicId,
          date: selectedDate.toISOString().split("T")[0], // ✅ formato YYYY-MM-DD
          time,
          physio_id: selectedPhysio,
          status: "pending", // ✅ coincide con la tabla
        },
      ])

      if (error) {
        console.error("❌ Error al crear la reserva:", error.message || error)
        toast({
          title: "Error al crear la reserva",
          description:
            error.message ||
            "No se pudo guardar la cita. Revisa las columnas en Supabase.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "✅ Reserva creada correctamente",
        description: "Tu cita se ha guardado en tu panel de reservas.",
      })

      // Reset y cierre del modal
      setOpen(false)
      setSelectedDate(undefined)
      setTime("")
      setSelectedPhysio("")
    } catch (err: any) {
      console.error("⚠️ Error inesperado:", err.message || err)
      toast({
        title: "Error inesperado",
        description: err.message || "Revisa la consola para más detalles.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-4 w-full">Reservar sesión</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md z-50 bg-background">
        <DialogHeader>
          <DialogTitle>Reserva tu sesión</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[80vh] overflow-y-auto">
          {/* Info del usuario autenticado */}
          {userEmail ? (
            <div className="text-sm text-muted-foreground">
              Reservando como <span className="font-medium">{userEmail}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Inicia sesión para hacer una reserva.
            </div>
          )}

          {/* Selector de fisioterapeuta */}
          <div>
            <Label>Fisioterapeuta</Label>
            <Select value={selectedPhysio} onValueChange={setSelectedPhysio}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un fisioterapeuta" />
              </SelectTrigger>
              <SelectContent>
                {physios.length > 0 ? (
                  physios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No hay fisioterapeutas disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div>
            <Label>Fecha</Label>
            <div className="rounded-md border p-2 mt-1 bg-background">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>
          </div>

          {/* Hora */}
          <div>
            <Label>Hora</Label>
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Ej. 16:30"
            />
          </div>

          {/* Botón de confirmación */}
          <Button
            className="w-full mt-2"
            onClick={handleReservation}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Confirmar reserva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
