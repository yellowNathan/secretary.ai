// The platform AI module currently fails to load in this preview's server runtime.
// Return an explicit error instead of leaving the app's API unavailable.
export async function POST() {
  return new Response("The built-in AI service is temporarily unavailable in this preview.", { status: 503 })
}
