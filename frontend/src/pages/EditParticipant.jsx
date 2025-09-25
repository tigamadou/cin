import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../api"

export default function EditParticipant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    organization: "",
    position: "",
    country: "",
    event_type: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [invalidFields, setInvalidFields] = useState(new Set())

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await api.getParticipant(id)
        const payload = result && result.data !== undefined ? result.data : result
        if (mounted) {
          setForm({
            first_name: payload.first_name || "",
            last_name: payload.last_name || "",
            email: payload.email || "",
            phone: payload.phone || "",
            organization: payload.organization || "",
            position: payload.position || "",
            country: payload.country || "",
            event_type: payload.event_type || ""
          })
        }
      } catch (err) {
        console.error("getParticipant failed:", err)
        if (mounted) setError(err.data?.detail || err.message || "Erreur")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])

  const update = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }))
    // Clear invalid state when user starts typing
    if (invalidFields.has(key)) {
      setInvalidFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  // Check email uniqueness on blur (excluding current participant)
  const handleEmailBlur = async () => {
    const email = form.email.trim()
    if (!email) return

    try {
      // Check if email already exists by trying to get participants
      const participants = await api.listParticipants()
      const existingParticipant = participants.data?.find(p => 
        p.email.toLowerCase() === email.toLowerCase() && p.id !== parseInt(id)
      )
      
      if (existingParticipant) {
        setError("Un participant avec cet email existe déjà.")
        setInvalidFields(new Set(['email']))
      }
    } catch (err) {
      // Ignore errors during email check
      console.warn("Email check failed:", err)
    }
  }

  // helper: get CSS classes for input fields based on validation state
  const getInputClasses = (fieldKey) => {
    const baseClasses = "w-full p-2 border rounded"
    const invalidClasses = "border-red-500 focus:border-red-500 focus:ring-red-500"
    const validClasses = "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    
    return `${baseClasses} ${invalidFields.has(fieldKey) ? invalidClasses : validClasses}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // client-side validation - all fields are required
    const requiredFields = [
      { key: 'first_name', label: 'Prénom' },
      { key: 'last_name', label: 'Nom' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'organization', label: 'Organisation' },
      { key: 'position', label: 'Poste' },
      { key: 'country', label: 'Pays' },
      { key: 'event_type', label: 'Type d\'événement' }
    ]

    const missingFields = requiredFields.filter(field => !form[field.key].trim())
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label).join(', ')
      setError(`Les champs suivants sont requis : ${fieldNames}.`)
      // Mark missing fields as invalid
      setInvalidFields(new Set(missingFields.map(f => f.key)))
      setSaving(false)
      return
    }

    try {
      await api.updateParticipant(id, form)
      navigate(`/participants/${id}`)
    } catch (err) {
      console.error("updateParticipant failed:", err)
      if (err && err.data && err.data.email) {
        // Handle email validation error specifically
        setError(err.data.email[0])
        setInvalidFields(new Set(['email']))
      } else {
        setError(err.data?.detail || err.message || "Erreur lors de la mise à jour")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/participants/${id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (error && !form.first_name) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">Erreur: {error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Modifier le participant</h2>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className={getInputClasses("first_name")}
            placeholder="Prénom"
            aria-label="Prénom"
          />
          <input
            required
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className={getInputClasses("last_name")}
            placeholder="Nom"
            aria-label="Nom"
          />
        </div>

        <input
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          onBlur={handleEmailBlur}
          className={getInputClasses("email")}
          placeholder="Email"
          type="email"
          aria-label="Email"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={getInputClasses("phone")}
            placeholder="Téléphone"
            aria-label="Téléphone"
          />
          <input
            required
            value={form.organization}
            onChange={(e) => update("organization", e.target.value)}
            className={getInputClasses("organization")}
            placeholder="Organisation"
            aria-label="Organisation"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
            className={getInputClasses("position")}
            placeholder="Poste"
            aria-label="Poste"
          />
          <input
            required
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className={getInputClasses("country")}
            placeholder="Pays"
            aria-label="Pays"
          />
        </div>

        <input
          required
          value={form.event_type}
          onChange={(e) => update("event_type", e.target.value)}
          className={getInputClasses("event_type")}
          placeholder="Type d'événement"
          aria-label="Type d'événement"
        />

        <div className="flex gap-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            type="submit"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>

          <button
            type="button"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
            onClick={handleCancel}
          >
            Annuler
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-red-600" role="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
    </div>
  )
}
