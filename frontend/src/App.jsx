import React, { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import ParticipantsList from "./pages/ParticipantsList"
import ParticipantDetail from "./pages/ParticipantDetail"
import AddParticipant from "./pages/AddParticipant"
import VerifyTicket from "./pages/VerifyTicket"
import { api } from "./api"
import RequireAdmin from "./components/RequireAdmin"
import LoginPage from "./pages/LoginPage"

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchUser() {
      try {
        const u = await api.currentUser()
        if (active) setUser(u.data)
      } catch (err) {
        if (active) setUser(null)
      }
    }

    fetchUser()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="container mx-auto p-4">
        <Routes>
          <Route
            path="/"
            element={
              <RequireAdmin>
                <ParticipantsList />
              </RequireAdmin>
            }
          />
          <Route
            path="/participants/new"
            element={
              <RequireAdmin>
                <AddParticipant />
              </RequireAdmin>
            }
          />
          <Route
            path="/participants/:id"
            element={
              <RequireAdmin>
                <ParticipantDetail />
              </RequireAdmin>
            }
          />
          <Route
            path="/verify"
            element={
              <RequireAdmin>
                <VerifyTicket />
              </RequireAdmin>
            }
          />
          <Route
            path="/login"
            element={
              <LoginPage onLoginSuccess={() => (window.location.href = "/")} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
