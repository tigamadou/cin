import React, { useState } from "react"
import { api } from "../api"

export default function AddParticipant() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" })
  const [resp, setResp] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResp(null)
    setLoading(true)

    try {
      const { status, data } = await api.createParticipant(form)
      // apiFetch lève une exception si status !ok, donc ici c'est un succès 2xx
      setResp(data)
      // optional: vider le form
      setForm({ first_name: "", last_name: "", email: "" })
    } catch (err) {
      console.error("createParticipant failed:", err)
      // err.status & err.data disponibles
      if (err.status === 415) {
        setError(
          "Type de contenu non-supporté (415). Vérifie le header Content-Type."
        )
      } else if (err.data && err.data.detail) {
        setError(err.data.detail)
      } else if (err.data) {
        setError(JSON.stringify(err.data))
      } else {
        setError(err.message || "Erreur lors de la création.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Ajouter participant</h2>

      <form onSubmit={submit} className="space-y-3">
        <input
          required
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          className="w-full p-2 border rounded"
          placeholder="Prénom"
        />
        <input
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          className="w-full p-2 border rounded"
          placeholder="Nom"
        />
        <input
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full p-2 border rounded"
          placeholder="Email"
          type="email"
        />
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer & Générer QR"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-red-600">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {resp && resp.qr_base64 && (
        <div className="mt-4">
          <h3 className="font-medium">Participant créé</h3>
          <img
            src={`data:image/png;base64,${resp.qr_base64}`}
            alt="qr"
            className="max-w-xs mt-2"
          />
          <p className="mt-2 text-sm text-gray-600">
            Le mail a été envoyé à {resp.email} (si SMTP configuré)
          </p>
        </div>
      )}
    </div>
  )
}
