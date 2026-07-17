import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";

if (!apiKey) {
  console.error(
    JSON.stringify({
      check: "claude_provider",
      ok: false,
      model,
      errorClass: "MissingApiKey",
    }),
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 30_000 });

try {
  const response = await client.messages.create({
    model,
    max_tokens: 16,
    system: "This is a provider health check. Reply only with OK.",
    messages: [{ role: "user", content: "OK" }],
  });
  console.log(
    JSON.stringify({
      check: "claude_provider",
      ok: true,
      model: response.model,
      requestId: response._request_id ?? null,
    }),
  );
} catch (error) {
  const candidate =
    error && typeof error === "object"
      ? error
      : { constructor: { name: "UnknownError" } };
  console.error(
    JSON.stringify({
      check: "claude_provider",
      ok: false,
      model,
      status: typeof candidate.status === "number" ? candidate.status : null,
      errorClass: candidate.constructor?.name ?? "UnknownError",
      requestId:
        typeof candidate.requestID === "string" ? candidate.requestID : null,
    }),
  );
  process.exit(1);
}
