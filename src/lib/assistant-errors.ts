// Only expose safe, actionable categories; never display server response bodies.
export function assistantHttpError(status: number): string {
  if (status === 401) return "AI_SIGN_IN"
  if (status === 403) return "AI_ENDPOINT_DENIED"
  if (status === 404 || status === 405) return "AI_ENDPOINT_MISSING"
  if (status === 400 || status === 413 || status === 422) return "AI_REQUEST_INVALID"
  if (status === 429) return "AI_RATE_LIMIT"
  return `AI_HTTP_${status >= 100 && status <= 599 ? status : "OTHER"}`
}
export function diagnosticCode(message: string): string {
  const allowed = /^(AI_SIGN_IN|AI_ENDPOINT_DENIED|AI_ENDPOINT_MISSING|AI_REQUEST_INVALID|AI_RATE_LIMIT|AI_WORKSPACE_SIGN_IN|AI_WORKSPACE_DENIED|AI_WORKSPACE_UNAVAILABLE|AI_WORKSPACE_NETWORK|AI_REGION_UNAVAILABLE|AI_PROVIDER_DENIED|AI_PROVIDER_UNKNOWN|AI_PROVIDER_TIMEOUT|AI_PROVIDER_NETWORK|AI_PROVIDER_HTTP_[45][0-9]{2}|AI_UNAVAILABLE|AI_NETWORK|AI_RESPONSE_FORMAT|AI_STREAM_FORMAT|AI_STREAM_INTERRUPTED|AI_STREAM_ERROR|AI_HTTP_(?:[1-5][0-9]{2}|OTHER))$/
  return allowed.test(message) ? message : "AI_UNKNOWN"
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
    case "AI_NETWORK": return "Couldn't reach the assistant endpoint. Check your connection and try again."
    case "AI_WORKSPACE_NETWORK": return "Couldn't reach your board or calendar. Check your connection and try again."
    case "AI_RESPONSE_FORMAT": return "The assistant endpoint returned an unexpected response. Republish and try again."
    case "AI_STREAM_FORMAT": return "The assistant returned an unreadable response. Please try again."
    case "AI_STREAM_INTERRUPTED": return "The assistant's reply was interrupted. Check your connection and try again."
    case "AI_STREAM_ERROR": return "The AI service returned an error. Please try again."
    case "AI_WORKSPACE_UNAVAILABLE": return "Couldn't load your board and calendar. Check your connection and try again."
    case "AI_REGION_UNAVAILABLE": return "The AI model is not available in this region. Please try again later or contact omg.dev support."
    case "AI_PROVIDER_DENIED": return "The AI service denied this request. If it keeps happening in the published app, contact omg.dev support."
    case "AI_PROVIDER_TIMEOUT": return "The AI service timed out. Please try again."
    case "AI_PROVIDER_NETWORK": return "The app couldn't connect to the AI service. Please try again."
    case "AI_PROVIDER_UNKNOWN": return "The AI service couldn't complete the request. Contact omg.dev support if this continues."
    default: return "The assistant couldn't reply. Check your connection and try again. If it only happens in the published app, contact omg.dev support."
  }
}
