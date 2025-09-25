import React, { useEffect, useState } from "react"
import { api } from "../api"
import { useParams, useNavigate } from "react-router-dom"

export default function ParticipantDetail() {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()

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

  // Delete participant function
  const handleDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le participant "${p.first_name} ${p.last_name}" ?`)) {
      return
    }

    setDeleting(true)
    try {
      await api.deleteParticipant(id)
      navigate('/participants')
    } catch (error) {
      console.error("Failed to delete participant:", error)
      alert("Erreur lors de la suppression du participant")
    } finally {
      setDeleting(false)
    }
  }

  // Edit participant function
  const handleEdit = () => {
    navigate(`/participants/${id}/edit`)
  }

  if (loading) return <div className="p-4">Chargement…</div>
  if (error)
    return <div className="p-4 text-red-600">Erreur: {String(error)}</div>
  if (!p) return <div className="p-4 text-gray-600">Aucun participant</div>

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      {/* Header */}
      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        {p.first_name} {p.last_name}
      </h2>
      <p className="text-sm text-gray-600">Email : {p.email}</p>
      {p.phone && (
        <p className="text-sm text-gray-600">Téléphone : {p.phone}</p>
      )}

      {/* Organisation & poste */}
      {(p.organization || p.position) && (
        <div className="mt-3">
          {p.organization && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Organisation :</span>{" "}
              {p.organization}
            </p>
          )}
          {p.position && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Poste :</span> {p.position}
            </p>
          )}
        </div>
      )}

      {/* Pays & type d’événement */}
      <div className="mt-3 text-sm text-gray-700">
        {p.country && (
          <p>
            <span className="font-medium">Pays :</span> {p.country}
          </p>
        )}
        {p.event_type && (
          <p>
            <span className="font-medium">Événement :</span> {p.event_type}
          </p>
        )}
      </div>

      {/* Ticket & statut */}
      <div className="mt-4">
        <p className="text-sm text-gray-500">
          <span className="font-medium">Ticket :</span> {p.ticket_uuid}
        </p>
        <p className="mt-1 text-sm">
          Statut :{" "}
          {p.used ? (
            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
              Utilisé{" "}
              {p.used_at ? `(le ${new Date(p.used_at).toLocaleString()})` : ""}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
              Actif
            </span>
          )}
        </p>
      </div>

      {/* QR Code */}
      {p.qr_base64 && (
        <div className="mt-6 text-center">
          <img
            alt="QR code"
            src={`data:image/png;base64,${p.qr_base64}`}
            className="mx-auto max-w-xs"
          />
          <p className="text-xs text-gray-500 mt-2">
            Présentez ce code lors de l'événement
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 justify-center">
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Modifier
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Suppression..." : "Supprimer"}
        </button>
        <button
          onClick={() => navigate('/participants')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Retour à la liste
        </button>
      </div>
    </div>
  )
}
