// Only expose safe, actionable categories; never display server response bodies.
export function assistantHttpError(status: number): string {
  if (status === 401) return "AI_SIGN_IN"
  if (status === 403) return "AI_ENDPOINT_DENIED"
  if (status === 404 || status === 405) return "AI_ENDPOINT_MISSING"
  if (status === 400 || status === 413 || status === 422) return "AI_REQUEST_INVALID"
  if (status === 429) return "AI_RATE_LIMIT"
  return "AI_UNAVAILABLE"
}
export function workspaceHttpError(status: number): string {
  if (status === 401) return "AI_WORKSPACE_SIGN_IN"
  if (status === 403) return "AI_WORKSPACE_DENIED"
  return "AI_WORKSPACE_UNAVAILABLE"
}
export function assistantErrorText(message: string): string {
  switch (message) {
    case "AI_SIGN_IN": return "The assistant endpoint requires sign-in (HTTP 401). Sign in again and retry."
    case "AI_ENDPOINT_DENIED": return "Access to the assistant endpoint was denied (HTTP 403). Contact omg.dev support if signing in again does not help."
    case "AI_WORKSPACE_SIGN_IN": return "Your board or calendar requires sign-in (HTTP 401). Sign in again and retry."
    case "AI_WORKSPACE_DENIED": return "Access to your board or calendar was denied (HTTP 403). Contact omg.dev support if signing in again does not help."
    case "AI_ENDPOINT_MISSING": return "The assistant endpoint is unavailable in this published version. Republish the latest version and try again."
    case "AI_REQUEST_INVALID": return "The assistant couldn't process this conversation. Try starting a new conversation."
    case "AI_RATE_LIMIT": return "The assistant is receiving too many requests. Please wait and try again."
    case "AI_WORKSPACE_UNAVAILABLE": return "Couldn't load your board and calendar. Check your connection and try again."
    case "AI_REGION_UNAVAILABLE": return "The AI model is not available in this region. Please try again later or contact omg.dev support."
    case "AI_PROVIDER_DENIED": return "The AI service denied this request. If it keeps happening in the published app, contact omg.dev support."
    default: return "The assistant couldn't reply. Check your connection and try again. If it only happens in the published app, contact omg.dev support."
  }
}
