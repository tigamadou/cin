import React, { useEffect, useState } from "react"
import { api } from "../api"
import { useParams } from "react-router-dom"

export default function ParticipantDetail() {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { id } = useParams()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await api.getParticipant(id)
        // result peut être soit la data directe, soit {status,data}
        const payload =
          result && result.data !== undefined ? result.data : result
        if (mounted) setP(payload)
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

  if (loading) return <div className="p-4">Chargement…</div>
  if (error)
    return <div className="p-4 text-red-600">Erreur: {String(error)}</div>
  if (!p) return <div className="p-4 text-gray-600">Aucun participant</div>

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-2">
        {p.first_name} {p.last_name}
      </h2>
      <p className="text-sm text-gray-600 mb-2">Email: {p.email}</p>
      <p className="text-sm text-gray-500">Ticket: {p.ticket_uuid}</p>
      {p.qr_base64 && (
        <img
          alt="qr"
          src={`data:image/png;base64,${p.qr_base64}`}
          className="mt-4 max-w-xs"
        />
      )}
    </div>
  )
}
