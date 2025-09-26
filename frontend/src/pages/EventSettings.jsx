import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { apiFetch } from '../utils/apiFetch'

const EventSettings = () => {
  const [settings, setSettings] = useState({
    event_name: '',
    event_description: '',
    venue: '',
    start_date: '',
    end_date: '',
    logo: null,
    logo_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await api.getEventSettings()
      const data = response.data
      
      // Format dates for datetime-local input
      const formatDateForInput = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM
      }
      
      setSettings({
        event_name: data.event_name || '',
        event_description: data.event_description || '',
        venue: data.venue || '',
        start_date: formatDateForInput(data.start_date),
        end_date: formatDateForInput(data.end_date),
        logo: null,
        logo_url: data.logo_url || ''
      })
    } catch (err) {
      console.error('Failed to load event settings:', err)
      setError('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
    setSuccess(false)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSettings(prev => ({
        ...prev,
        logo: file,
        logo_url: URL.createObjectURL(file) // Preview URL
      }))
      setError(null)
      setSuccess(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('event_name', settings.event_name)
      formData.append('event_description', settings.event_description)
      formData.append('venue', settings.venue)
      if (settings.start_date) formData.append('start_date', settings.start_date)
      if (settings.end_date) formData.append('end_date', settings.end_date)
      if (settings.logo) formData.append('logo', settings.logo)

      // Use apiFetch for proper CSRF handling
      const response = await apiFetch('/api/event-settings/', {
        method: 'PUT',
        body: formData
      })

      setSettings(prev => ({
        ...prev,
        logo: null, // Clear the file after successful upload
        logo_url: response.data.logo_url || prev.logo_url
      }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to update event settings:', err)
      setError(err.data?.detail || err.message || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'événement</h1>
            <Link 
              to="/participants" 
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Retour à la liste
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Paramètres mis à jour avec succès !
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'événement *
              </label>
              <input
                type="text"
                id="event_name"
                value={settings.event_name}
                onChange={(e) => handleChange('event_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de l'événement"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Ce nom apparaîtra dans les emails d'invitation et l'interface
              </p>
            </div>

            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                Logo de l'événement
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Formats acceptés: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>
                {settings.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={settings.logo_url}
                      alt="Logo preview"
                      className="h-16 w-16 object-contain border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="event_description" className="block text-sm font-medium text-gray-700 mb-2">
                Description de l'événement
              </label>
              <textarea
                id="event_description"
                value={settings.event_description}
                onChange={(e) => handleChange('event_description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description optionnelle de l'événement"
              />
              <p className="mt-1 text-sm text-gray-500">
                Description optionnelle qui peut être utilisée dans les communications
              </p>
            </div>

            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                Lieu de l'événement
              </label>
              <input
                type="text"
                id="venue"
                value={settings.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Centre de conférences, Salle 101, 123 Rue Example"
              />
              <p className="mt-1 text-sm text-gray-500">
                Adresse ou lieu où se déroule l'événement
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date et heure de début
                </label>
                <input
                  type="datetime-local"
                  id="start_date"
                  value={settings.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Quand commence l'événement
                </p>
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date et heure de fin
                </label>
                <input
                  type="datetime-local"
                  id="end_date"
                  value={settings.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Quand se termine l'événement
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                to="/participants"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EventSettings
