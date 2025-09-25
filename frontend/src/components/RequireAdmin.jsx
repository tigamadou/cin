import React, { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"

export default function RequireAdmin({ children }) {
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch("/api/current_user/", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setIsAdmin(Boolean(j?.is_staff))
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <div>Vérification…</div>
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}
