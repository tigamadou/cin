import { getCookie } from "./cookies"
import { getApiUrl } from "./apiConfig"

// Cache for CSRF token to avoid multiple fetches
let csrfTokenPromise = null

async function ensureCsrfToken() {
  // Check if token already exists in cookie
  const existingToken = getCookie("csrftoken")
  if (existingToken) {
    return existingToken
  }

  // If we're already fetching, wait for that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise
  }

  // Fetch CSRF token
  csrfTokenPromise = fetch(getApiUrl("csrf/"), { credentials: "include" })
    .then((r) => r.json())
    .then((j) => {
      // Token should be set in cookie by the server
      const token = getCookie("csrftoken") || j.csrfToken
      csrfTokenPromise = null // Reset promise cache
      return token
    })
    .catch((err) => {
      csrfTokenPromise = null // Reset promise cache on error
      console.warn("Failed to fetch CSRF token:", err)
      return null
    })

  return csrfTokenPromise
}

export async function apiFetch(url, opts = {}) {
  const method = (opts.method || "GET").toUpperCase()
  const isJsonBody = opts.body && typeof opts.body === "string"
  const isFormData = opts.body instanceof FormData

  const defaultHeaders = {
    ...(opts.headers || {})
  }

  // Si on envoie un body JSON, s'assurer du bon Content-Type
  // Pour FormData, ne pas définir Content-Type (le navigateur le définira avec le boundary)
  if (isJsonBody && !defaultHeaders["Content-Type"] && !isFormData) {
    defaultHeaders["Content-Type"] = "application/json"
  }
  
  // Pour FormData, s'assurer qu'on ne définit pas Content-Type (le navigateur le gère)
  if (isFormData && defaultHeaders["Content-Type"]) {
    delete defaultHeaders["Content-Type"]
  }

  // Ajouter X-CSRFToken pour les méthodes mutantes
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    // Only add CSRF token if not already provided in headers
    if (!defaultHeaders["X-CSRFToken"]) {
      let csrftoken = getCookie("csrftoken")
      
      // If no token in cookie, try to fetch it
      if (!csrftoken) {
        csrftoken = await ensureCsrfToken()
      }
      
      // Use fetched token or try cookie again (in case it was set during fetch)
      const tokenToUse = csrftoken || getCookie("csrftoken")
      if (tokenToUse) {
        defaultHeaders["X-CSRFToken"] = tokenToUse
      }
    }
  }

  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: defaultHeaders
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    data = text
  }

  if (!res.ok) {
    // Normaliser l'erreur
    const err = new Error(data?.detail || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return { status: res.status, data }
}
