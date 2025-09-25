// src/components/AddParticipant.jsx
import React, { useState } from "react"
import { api } from "../api" // j'assume que api.createParticipant existe et renvoie { status, data }

export default function AddParticipant() {
  const initialForm = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    organization: "",
    position: "",
    country: "",
    event_type: ""
  }

  const [form, setForm] = useState(initialForm)
  const [resp, setResp] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key, value) => setForm((s) => ({ ...s, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResp(null)

    // client-side minimal validation
    if (!form.first_name.trim() || !form.email.trim()) {
      setError("Le prénom et l'email sont requis.")
      return
    }

    setLoading(true)
    try {
      const { status, data } = await api.createParticipant(form)
      // si ta fonction api lance une erreur au lieu de retourner status/data, adapte en conséquence
      setResp(data)
      setForm(initialForm)
    } catch (err) {
      console.error("createParticipant failed:", err)
      if (err && err.status === 415) {
        setError(
          "Type de contenu non-supporté (415). Vérifie le header Content-Type."
        )
      } else if (err && err.data && err.data.detail) {
        setError(err.data.detail)
      } else if (err && err.data) {
        setError(JSON.stringify(err.data))
      } else {
        setError(err?.message || "Erreur lors de la création.")
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadQrFromBase64 = (base64, filename = "qr.png") => {
    const link = document.createElement("a")
    link.href = `data:image/png;base64,${base64}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // petit feedback temporaire
      setError(null)
      setResp((r) => ({ ...r, _copied: true }))
      setTimeout(() => setResp((r) => (r ? { ...r, _copied: false } : r)), 1500)
    } catch {
      setError("Impossible de copier dans le presse-papiers.")
    }
  }

  // helper: get a usable QR url (prefer qr_url, fallback to data url)
  const getQrSrc = (r) => {
    if (!r) return null
    if (r.qr_url) return r.qr_url
    if (r.qr_base64) return `data:image/png;base64,${r.qr_base64}`
    return null
  }

  return (
    <div
      className="max-w-lg mx-auto bg-white p-6 rounded shadow"
      role="region"
      aria-label="Ajouter participant"
    >
      <h2 className="text-lg font-semibold mb-4">Ajouter participant</h2>

      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Prénom"
            aria-label="Prénom"
          />
          <input
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Nom"
            aria-label="Nom"
          />
        </div>

        <input
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Email"
          type="email"
          aria-label="Email"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Téléphone"
            aria-label="Téléphone"
          />
          <input
            value={form.organization}
            onChange={(e) => update("organization", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Organisation"
            aria-label="Organisation"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Poste"
            aria-label="Poste"
          />
          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Pays"
            aria-label="Pays"
          />
        </div>

        <input
          value={form.event_type}
          onChange={(e) => update("event_type", e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Type d'événement"
          aria-label="Type d'événement"
        />

        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Envoi..." : "Envoyer & Générer QR"}
          </button>

          <button
            type="button"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
            onClick={() => {
              setForm(initialForm)
              setError(null)
              setResp(null)
            }}
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-red-600" role="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {resp && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-medium">Participant créé</h3>

          <div className="mt-2 flex items-center gap-3">
            <div>
              {getQrSrc(resp) ? (
                <img
                  src={getQrSrc(resp)}
                  alt="QR code du participant"
                  className="max-w-xs border rounded"
                />
              ) : (
                <div className="p-3 bg-gray-50 text-sm text-gray-600 rounded">
                  QR non disponible
                </div>
              )}
            </div>

            <div className="text-sm text-gray-700">
              <p>
                <strong>Email:</strong> {resp.email}
              </p>
              <p className="mt-1">
                <strong>Ticket:</strong>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {resp.ticket_uuid}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resp.ticket_uuid)}
                  className="ml-2 text-sm underline"
                >
                  Copier
                </button>
                {resp._copied && (
                  <span className="ml-2 text-green-600">copied ✓</span>
                )}
              </p>

              <div className="mt-3 flex gap-2">
                {resp.qr_base64 && (
                  <button
                    type="button"
                    className="px-3 py-1 border rounded text-sm"
                    onClick={() =>
                      downloadQrFromBase64(
                        resp.qr_base64,
                        `${resp.ticket_uuid}.png`
                      )
                    }
                  >
                    Télécharger QR
                  </button>
                )}

                {resp.qr_url && (
                  <a
                    className="px-3 py-1 border rounded text-sm"
                    href={resp.qr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir QR (nouvel onglet)
                  </a>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Le mail a été envoyé à {resp.email} (si SMTP configuré).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
