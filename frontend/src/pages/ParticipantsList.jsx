import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api"

export default function ParticipantsList() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // "all", "active", "used"
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

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

  // Filter and search logic
  const filteredList = list.filter((p) => {
    // Status filter
    const statusMatch = 
      statusFilter === "all" || 
      (statusFilter === "active" && !p.used) || 
      (statusFilter === "used" && p.used)

    // Search filter
    const searchMatch = searchTerm === "" || 
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.organization && p.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.position && p.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.country && p.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.event_type && p.event_type.toLowerCase().includes(searchTerm.toLowerCase()))

    return statusMatch && searchMatch
  })

  // Delete participant function
  const handleDelete = async (participantId, participantName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le participant "${participantName}" ?`)) {
      return
    }

    setDeletingId(participantId)
    try {
      await api.deleteParticipant(participantId)
      // Remove from local list
      setList(prevList => prevList.filter(p => p.id !== participantId))
    } catch (error) {
      console.error("Failed to delete participant:", error)
      alert("Erreur lors de la suppression du participant")
    } finally {
      setDeletingId(null)
    }
  }

  // Edit participant function
  const handleEdit = (participantId) => {
    navigate(`/participants/${participantId}/edit`)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Participants</h2>
          {!loading && (
            <p className="text-sm text-gray-600 mt-1">
              {filteredList.length} participant{filteredList.length !== 1 ? 's' : ''} 
              {(searchTerm || statusFilter !== "all") && (
                <span className="text-gray-500">
                  {" "}(sur {list.length} total)
                </span>
              )}
              {filteredList.length > 0 && (
                <span className="ml-2">
                  ({filteredList.filter(p => !p.used).length} actif{filteredList.filter(p => !p.used).length !== 1 ? 's' : ''}, {filteredList.filter(p => p.used).length} utilisé{filteredList.filter(p => p.used).length !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          )}
        </div>
        <Link
          to="/participants/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Ajouter
        </Link>
      </div>

      {/* Search and Filter Bar */}
      {!loading && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone, organisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs seulement</option>
                <option value="used">Utilisés seulement</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-600">Chargement...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {/* Participant Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {p.ticket_uuid?.slice(0, 8)}...
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{p.email}</div>
                        {p.phone && (
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">☎</span> {p.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Organisation */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {p.organization && (
                          <div className="text-sm text-gray-900">{p.organization}</div>
                        )}
                        {p.position && (
                          <div className="text-sm text-gray-500 italic">{p.position}</div>
                        )}
                        {p.event_type && (
                          <div className="text-xs text-gray-400 mt-1">
                            Événement: {p.event_type}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Localisation */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {p.country || '-'}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.used ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Utilisé
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/participants/${p.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Détails
                        </Link>
                        <button
                          onClick={() => handleEdit(p.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, `${p.first_name} ${p.last_name}`)}
                          disabled={deletingId === p.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deletingId === p.id ? "Suppression..." : "Supprimer"}
                        </button>
                        {p.qr_url && (
                          <a
                            href={p.qr_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            QR
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {list.length === 0 ? (
                "Aucun participant trouvé"
              ) : (
                <div>
                  <p>Aucun participant ne correspond aux critères de recherche</p>
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
