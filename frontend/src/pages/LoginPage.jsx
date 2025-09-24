import React, { useState, useEffect } from "react"

// helper pour lire cookie (csrftoken)
function getCookie(name) {
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")
  return m ? m.pop() : ""
}

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [csrf, setCsrf] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // demander le cookie CSRF au chargement
  useEffect(() => {
    fetch("/api/csrf/", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const token = getCookie("csrftoken") || j.csrfToken
        setCsrf(token)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const resp = await fetch("/api/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf || getCookie("csrftoken")
        },
        body: JSON.stringify({ username, password })
      })
      const json = await resp.json()
      if (!resp.ok) {
        setError(json.detail || "Échec de l'authentification")
        setLoading(false)
        return
      }
      if (onLoginSuccess) onLoginSuccess(json)
    } catch (err) {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion administrateur
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
        </form>
      </div>
    </div>
  )
}
