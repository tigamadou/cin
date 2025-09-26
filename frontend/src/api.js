import { apiFetch } from "./utils/apiFetch"

// Use environment variable for API URL, fallback to relative path
const API_BASE_URL = import.meta.env.VITE_API_URL || ""
const API_PREFIX = `${API_BASE_URL}/api`

export const api = {
  listParticipants: () =>
    apiFetch(`${API_PREFIX}/participants/`, { method: "GET" }),

  getParticipant: (id) =>
    apiFetch(`${API_PREFIX}/participants/${encodeURIComponent(id)}/`, {
      method: "GET"
    }),

  createParticipant: (payload) =>
    apiFetch(`${API_PREFIX}/participants/`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateParticipant: (id, payload) =>
    apiFetch(`${API_PREFIX}/participants/${encodeURIComponent(id)}/`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  deleteParticipant: (id) =>
    apiFetch(`${API_PREFIX}/participants/${encodeURIComponent(id)}/`, {
      method: "DELETE"
    }),

  verifyTicket: (payload) =>
    apiFetch(`${API_PREFIX}/verify/`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  toggleRegistration: (isOpen) =>
    apiFetch(`${API_PREFIX}/toggle-registration/`, {
      method: "POST",
      body:
        isOpen === undefined
          ? undefined
          : JSON.stringify({ is_open: Boolean(isOpen) })
    }),

  currentUser: () => apiFetch(`${API_PREFIX}/current_user/`, { method: "GET" }),

  // Event settings
  getEventSettings: () => apiFetch(`${API_PREFIX}/event-settings/`, { method: "GET" }),
  updateEventSettings: (payload) =>
    apiFetch(`${API_PREFIX}/event-settings/`, {
      method: "PUT",
      body: JSON.stringify(payload)
    })
}
