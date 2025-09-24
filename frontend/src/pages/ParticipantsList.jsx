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
            <div key={p.id} className="bg-white p-4 rounded shadow">
              <h3 className="font-medium">
                {p.first_name} {p.last_name}
              </h3>
              <p className="text-sm text-gray-600">{p.email}</p>
              <div className="mt-2 flex gap-2">
                <Link
                  to={`/participants/${p.id}`}
                  className="text-sm text-blue-600"
                >
                  Détails
                </Link>
                <a
                  href={p.qr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-gray-600"
                >
                  Ouvrir QR
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
