import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const EventSettings = () => {
  const [settings, setSettings] = useState({
    event_name: '',
    event_description: '',
    venue: '',
    start_date: '',
    end_date: '',
    logo: null,
    logo_url: '',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_password: '',
    smtp_use_tls: false,
    smtp_use_ssl: false,
    smtp_from_email: ''
  })
  const [activeTab, setActiveTab] = useState('event') // 'event' or 'smtp'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [testEmail, setTestEmail] = useState('') // Email address for SMTP test
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState(null)

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
        logo_url: data.logo_url || '',
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || '',
        smtp_user: data.smtp_user || '',
        smtp_password: data.smtp_password === '***' ? '' : (data.smtp_password || ''), // Handle masked password
        smtp_use_tls: data.smtp_use_tls || false,
        smtp_use_ssl: data.smtp_use_ssl || false,
        smtp_from_email: data.smtp_from_email || ''
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
      
      // SMTP settings
      formData.append('smtp_host', settings.smtp_host)
      if (settings.smtp_port) formData.append('smtp_port', settings.smtp_port)
      formData.append('smtp_user', settings.smtp_user)
      if (settings.smtp_password) formData.append('smtp_password', settings.smtp_password)
      formData.append('smtp_use_tls', settings.smtp_use_tls)
      formData.append('smtp_use_ssl', settings.smtp_use_ssl)
      formData.append('smtp_from_email', settings.smtp_from_email)

      // Use api.updateEventSettings for proper API URL handling and CSRF
      const response = await api.updateEventSettings(formData)

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

  const handleTestSMTP = async () => {
    // Validate email address
    if (!testEmail || !testEmail.includes('@')) {
      setSmtpTestResult({
        success: false,
        message: 'Veuillez entrer une adresse email valide pour le test'
      })
      return
    }

    setTestingSMTP(true)
    setSmtpTestResult(null)
    setError(null)

    try {
      const response = await api.testSMTP(testEmail)
      setSmtpTestResult({
        success: true,
        message: response.data.detail || 'Email de test envoyé avec succès!'
      })
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: err.data?.detail || err.message || 'Erreur lors du test SMTP'
      })
    } finally {
      setTestingSMTP(false)
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

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('event')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'event'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informations de l'événement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('smtp')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'smtp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuration SMTP
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Information Tab */}
            {activeTab === 'event' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* SMTP Configuration Tab */}
            {activeTab === 'smtp' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuration SMTP</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Configurez les paramètres SMTP pour l'envoi d'emails. Si non configuré, les paramètres d'environnement seront utilisés.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smtp_host" className="block text-sm font-medium text-gray-700 mb-2">
                      Serveur SMTP
                    </label>
                    <input
                      type="text"
                      id="smtp_host"
                      value={settings.smtp_host}
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700 mb-2">
                      Port SMTP
                    </label>
                    <input
                      type="number"
                      id="smtp_port"
                      value={settings.smtp_port}
                      onChange={(e) => handleChange('smtp_port', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 587 (TLS) ou 465 (SSL)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smtp_user" className="block text-sm font-medium text-gray-700 mb-2">
                      Utilisateur SMTP
                    </label>
                    <input
                      type="text"
                      id="smtp_user"
                      value={settings.smtp_user}
                      onChange={(e) => handleChange('smtp_user', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email ou nom d'utilisateur"
                    />
                  </div>

                  <div>
                    <label htmlFor="smtp_password" className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe SMTP
                    </label>
                    <input
                      type="password"
                      id="smtp_password"
                      value={settings.smtp_password}
                      onChange={(e) => handleChange('smtp_password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mot de passe SMTP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smtp_from_email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email expéditeur
                    </label>
                    <input
                      type="email"
                      id="smtp_from_email"
                      value={settings.smtp_from_email}
                      onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="noreply@example.com"
                    />
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="smtp_use_tls"
                        checked={settings.smtp_use_tls}
                        onChange={(e) => handleChange('smtp_use_tls', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="smtp_use_tls" className="ml-2 block text-sm text-gray-700">
                        Utiliser TLS (port 587)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="smtp_use_ssl"
                        checked={settings.smtp_use_ssl}
                        onChange={(e) => handleChange('smtp_use_ssl', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="smtp_use_ssl" className="ml-2 block text-sm text-gray-700">
                        Utiliser SSL (port 465)
                      </label>
                    </div>
                  </div>
                </div>

                {/* SMTP Test Section */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tester la configuration SMTP</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Envoyez un email de test pour vérifier que votre configuration SMTP fonctionne correctement.
                  </p>
                  
                  <div className="mb-4">
                    <label htmlFor="test_email" className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse email de test *
                    </label>
                    <input
                      type="email"
                      id="test_email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@example.com"
                      disabled={testingSMTP}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      L'email de test sera envoyé à cette adresse
                    </p>
                  </div>
                  
                  {smtpTestResult && (
                    <div className={`mb-4 p-4 rounded ${
                      smtpTestResult.success
                        ? 'bg-green-100 border border-green-400 text-green-700'
                        : 'bg-red-100 border border-red-400 text-red-700'
                    }`}>
                      {smtpTestResult.message}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleTestSMTP}
                    disabled={testingSMTP || !settings.smtp_host || !testEmail}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingSMTP ? 'Test en cours...' : 'Envoyer un email de test'}
                  </button>
                  {!settings.smtp_host && (
                    <p className="mt-2 text-sm text-gray-500">
                      Veuillez d'abord configurer le serveur SMTP
                    </p>
                  )}
                </div>
              </div>
            )}

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
