import { getCookie } from "./cookies"

export async function apiFetch(url, opts = {}) {
  const method = (opts.method || "GET").toUpperCase()
  const isJsonBody = opts.body && typeof opts.body === "string"

  const defaultHeaders = {
    ...(opts.headers || {})
  }

  // Si on envoie un body JSON, s'assurer du bon Content-Type
  if (isJsonBody && !defaultHeaders["Content-Type"]) {
    defaultHeaders["Content-Type"] = "application/json"
  }

  // Ajouter X-CSRFToken pour les méthodes mutantes
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrftoken = getCookie("csrftoken")
    if (!defaultHeaders["X-CSRFToken"] && csrftoken) {
      defaultHeaders["X-CSRFToken"] = csrftoken
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
