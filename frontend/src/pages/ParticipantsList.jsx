import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"

export default function ParticipantsList() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.listParticipants()
        // res peut être soit {status, data}, soit directement data
        const payload = res && res.data !== undefined ? res.data : res
        const list = Array.isArray(payload) ? payload : payload?.results || []
        if (mounted) setList(list)
      } catch (err) {
        console.error("Failed to fetch participants:", err)
        if (mounted) {
          setList([])
          // optional: setError(err.message || 'Erreur');
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Participants</h2>
        <Link
          to="/participants/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Ajouter
        </Link>
      </div>

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded shadow hover:shadow-md transition"
            >
              {/* Header : nom complet */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  {p.first_name} {p.last_name}
                </h3>
                {p.used ? (
                  <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                    Utilisé
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                    Actif
                  </span>
                )}
              </div>

              {/* Infos principales */}
              <p className="text-sm text-gray-600">{p.email}</p>
              {p.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">☎</span> {p.phone}
                </p>
              )}

              {/* Organisation + poste */}
              <div className="mt-2 text-sm text-gray-700">
                {p.organization && <p>{p.organization}</p>}
                {p.position && <p className="italic">{p.position}</p>}
              </div>

              {/* Pays + type d'événement */}
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
                {p.country && <span>Pays : {p.country}</span>}
                {p.event_type && <span>Événement : {p.event_type}</span>}
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-3 text-sm">
                <Link
                  to={`/participants/${p.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Détails
                </Link>
                {p.qr_url && (
                  <a
                    href={p.qr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-600 hover:underline"
                  >
                    Ouvrir QR
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
