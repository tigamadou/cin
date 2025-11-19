/**
 * Centralized API configuration
 * Uses VITE_API_URL from environment variables (set during build)
 * Falls back to relative paths for development
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || ""

/**
 * Determine if we should use /api prefix
 * - If API_BASE_URL is set (full domain like https://api.cin2025.bj), don't add /api prefix
 *   because the domain itself is the API subdomain
 * - If API_BASE_URL is empty (relative paths), add /api prefix for development
 */
const shouldUseApiPrefix = !API_BASE_URL || API_BASE_URL === ""
export const API_PREFIX = shouldUseApiPrefix ? "/api" : API_BASE_URL

/**
 * Helper to build full API URLs
 * @param {string} path - API path (e.g., 'current_user/', 'csrf/', 'login/')
 * @returns {string} Full API URL
 */
export function getApiUrl(path) {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path
  
  // Handle API_PREFIX - remove trailing slash if present
  let prefix = API_PREFIX
  if (prefix.endsWith("/")) {
    prefix = prefix.slice(0, -1)
  }
  
  // Build URL: prefix/path (ensuring single slash between them)
  // If prefix is empty (relative path), just return /path
  if (!prefix) {
    return `/${cleanPath}`
  }
  
  return `${prefix}/${cleanPath}`
}

