// utils/cookies.js (optionnel)
export function getCookie(name) {
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")
  return m ? m.pop() : ""
}
