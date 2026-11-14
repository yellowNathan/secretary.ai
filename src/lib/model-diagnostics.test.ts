import { describe, expect, test } from "bun:test"
import { modelErrorCode } from "./model-diagnostics"

describe("safe model error diagnostics", () => {
  test("classifies nested provider statuses without revealing error contents", () => {
    expect(modelErrorCode({ message: "private conversation", cause: { response: { status: 503 } } })).toBe("AI_PROVIDER_HTTP_503")
    expect(modelErrorCode({ cause: { statusCode: 403, message: "private token" } })).toBe("AI_PROVIDER_DENIED")
    expect(modelErrorCode({ cause: { errors: [{ statusCode: 429 }] } })).toBe("AI_RATE_LIMIT")
  })
  test("distinguishes availability, network, and unknown errors safely", () => {
    expect(modelErrorCode(new Error("This model is not available in your region."))).toBe("AI_REGION_UNAVAILABLE")
    expect(modelErrorCode(new Error("fetch failed: private url"))).toBe("AI_PROVIDER_NETWORK")
    expect(modelErrorCode(new Error("private provider detail"))).toBe("AI_PROVIDER_UNKNOWN")
  })
})
