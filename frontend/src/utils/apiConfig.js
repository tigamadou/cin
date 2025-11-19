/**
 * Centralized API configuration
 * Uses VITE_API_URL from environment variables (set during build)
 * Falls back to relative paths for development
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || ""
export const API_PREFIX = `${API_BASE_URL}/api`

/**
 * Helper to build full API URLs
 * @param {string} path - API path (e.g., '/login/', '/csrf/')
 * @returns {string} Full API URL
 */
export function getApiUrl(path) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path
  return `${API_PREFIX}/${cleanPath}`
}

