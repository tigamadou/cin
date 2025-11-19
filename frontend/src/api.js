import { apiFetch } from "./utils/apiFetch"
import { getApiUrl } from "./utils/apiConfig"

export const api = {
  listParticipants: () =>
    apiFetch(getApiUrl("participants/"), { method: "GET" }),

  getParticipant: (id) =>
    apiFetch(getApiUrl(`participants/${encodeURIComponent(id)}/`), {
      method: "GET"
    }),

  createParticipant: (payload) =>
    apiFetch(getApiUrl("participants/"), {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateParticipant: (id, payload) =>
    apiFetch(getApiUrl(`participants/${encodeURIComponent(id)}/`), {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  deleteParticipant: (id) =>
    apiFetch(getApiUrl(`participants/${encodeURIComponent(id)}/`), {
      method: "DELETE"
    }),

  verifyTicket: (payload) =>
    apiFetch(getApiUrl("verify/"), {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  toggleRegistration: (isOpen) =>
    apiFetch(getApiUrl("toggle-registration/"), {
      method: "POST",
      body:
        isOpen === undefined
          ? undefined
          : JSON.stringify({ is_open: Boolean(isOpen) })
    }),

  currentUser: () => apiFetch(getApiUrl("current_user/"), { method: "GET" }),

  // Event settings
  getEventSettings: () => apiFetch(getApiUrl("event-settings/"), { method: "GET" }),
  updateEventSettings: (payload) => {
    // Handle FormData (for file uploads) or JSON payload
    const isFormData = payload instanceof FormData
    const options = {
      method: "PUT",
      body: isFormData ? payload : JSON.stringify(payload)
    }
    
    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!isFormData) {
      options.headers = {
        "Content-Type": "application/json"
      }
    }
    
    return apiFetch(getApiUrl("event-settings/"), options)
  },
  testSMTP: (email) =>
    apiFetch(getApiUrl("event-settings/test-smtp/"), {
      method: "POST",
      body: JSON.stringify({ email })
    })
}
