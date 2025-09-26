// frontend/src/components/Navbar.jsx
import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api"
import { apiFetch } from "../utils/apiFetch"

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const [regOpen, setRegOpen] = useState(null) // null = unknown/loading
  const [loadingToggle, setLoadingToggle] = useState(false)
  const [error, setError] = useState(null)

  // read registration state on mount (only if user is admin)
  useEffect(() => {
    let mounted = true
    async function fetchState() {
      if (!user || !user.is_staff) {
        if (mounted) setRegOpen(null)
        return
      }
      try {
        // prefer api helper if available
        if (
          api &&
          typeof api.toggleRegistration === "function" &&
          api._getRegistrationStatus
        ) {
          // if you implemented a dedicated getter on api, prefer it
          const res = await api._getRegistrationStatus()
          const payload = res?.data ?? res
          if (mounted) setRegOpen(Boolean(payload?.is_open))
        } else {
          // fallback: GET /api/toggle-registration/
          const res = await apiFetch("/api/toggle-registration/", {
            method: "GET"
          })
          const payload = res?.data ?? res
          if (mounted) setRegOpen(Boolean(payload?.is_open))
        }
      } catch (err) {
        console.warn("Failed to fetch registration state", err)
        if (mounted) {
          setRegOpen(null)
          setError("Impossible de récupérer l'état des inscriptions")
        }
      }
    }
    fetchState()
    return () => {
      mounted = false
    }
  }, [user])

  async function handleToggleRegistration() {
    setError(null)
    setLoadingToggle(true)
    try {
      // prefer api helper if available
      let res
      if (api && typeof api.toggleRegistration === "function") {
        // call without arg to toggle server-side, or pass explicit boolean to set
        res = await api.toggleRegistration()
      } else {
        // fallback: POST to toggle endpoint (server toggles if no body)
        res = await apiFetch("/api/toggle-registration/", { method: "POST" })
      }
      const payload = res?.data ?? res
      setRegOpen(Boolean(payload?.is_open))
    } catch (err) {
      console.error("toggle error", err)
      setError(err?.data?.detail || err?.message || "Erreur lors du toggle")
    } finally {
      setLoadingToggle(false)
    }
  }

  async function handleLogout() {
    try {
      if (api && typeof api.logout === "function") {
        await api.logout()
      } else {
        await apiFetch("/api/logout/", { method: "POST" })
      }
    } catch (err) {
      console.warn("logout failed", err)
    } finally {
      // redirect to login page (or reload)
      navigate("/login", { replace: true })
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-semibold text-gray-800">
            Cin2025
          </Link>
          {user?.is_staff && (
            <>
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
                Participants
              </Link>
              <Link
                to="/verify"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Vérifier QR
              </Link>
              <Link
                to="/settings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Paramètres
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.is_authenticated ? (
            <>
              {/* Toggle registration - only show for staff */}
              {user.is_staff && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600 mr-2">Inscriptions</div>

                  <button
                    onClick={handleToggleRegistration}
                    disabled={loadingToggle || regOpen === null}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none ${
                      regOpen ? "bg-green-500" : "bg-gray-300"
                    }`}
                    title={
                      regOpen
                        ? "Fermer les inscriptions"
                        : "Ouvrir les inscriptions"
                    }
                  >
                    <span
                      className={`inline-block w-5 h-5 transform bg-white rounded-full shadow transition-transform ${
                        regOpen ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  {regOpen === null ? (
                    <div className="text-sm text-gray-500">…</div>
                  ) : (
                    <div
                      className={`text-sm ${
                        regOpen ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {regOpen ? "Ouvert" : "Fermé"}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700">
                  Bonjour {user.username}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Admin login
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border-t border-yellow-100 text-yellow-700 text-sm px-4 py-2">
          {error}
        </div>
      )}
    </header>
  )
}
