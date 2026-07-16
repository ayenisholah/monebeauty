import assert from "node:assert/strict";
import test from "node:test";
import {
  answerReliably,
  claudeRuntimeConfig,
  groundedFallback,
  sourceLinks,
} from "../lib/chat-reliability";
import type { KnowledgeResult } from "../lib/chat-knowledge";

const matchedKnowledge: KnowledgeResult = {
  matched: true,
  snippets: [
    {
      title: "Endospheres therapy",
      body: "Approved clinic description copied exactly from the treatment page.",
      url: "/instrumental/endosphere",
    },
    {
      title: "Booking",
      body: "Appointments are available through the online booking flow.",
      url: "/booking?service=endospheres",
    },
  ],
};

const unmatchedKnowledge: KnowledgeResult = {
  matched: false,
  snippets: matchedKnowledge.snippets,
};

test("Claude runtime configuration uses the explicit model, bounded timeout, and one retry", () => {
  assert.deepEqual(
    claudeRuntimeConfig({
      ANTHROPIC_API_KEY: " test-key ",
      ANTHROPIC_MODEL: "claude-sonnet-5",
      ANTHROPIC_TIMEOUT_MS: "12000",
    }),
    {
      apiKey: "test-key",
      configured: true,
      maxRetries: 1,
      model: "claude-sonnet-5",
      timeoutMs: 12_000,
    },
  );
  assert.equal(
    claudeRuntimeConfig({ ANTHROPIC_TIMEOUT_MS: "999999" }).timeoutMs,
    30_000,
  );
});

test("missing or blank Claude configuration is treated as unavailable", () => {
  assert.equal(claudeRuntimeConfig({}).configured, false);
  assert.equal(
    claudeRuntimeConfig({ ANTHROPIC_API_KEY: "   " }).configured,
    false,
  );
});

test("successful Claude completion keeps approved source links and is not degraded", async () => {
  const result = await answerReliably({
    locale: "en",
    knowledge: matchedKnowledge,
    configured: true,
    complete: async () => "A grounded Claude answer.",
  });

  assert.equal(result.answer, "A grounded Claude answer.");
  assert.equal(result.degraded, false);
  assert.deepEqual(result.sources, [
    {
      title: "Endospheres therapy",
      href: "/instrumental/endosphere",
    },
    { title: "Booking", href: "/booking?service=endospheres" },
  ]);
});

test("missing configuration returns a matched grounded fallback without calling Claude", async () => {
  let called = false;
  const result = await answerReliably({
    locale: "en",
    knowledge: matchedKnowledge,
    configured: false,
    complete: async () => {
      called = true;
      return "unexpected";
    },
  });

  assert.equal(called, false);
  assert.equal(result.degraded, true);
  assert.match(result.answer, /Approved clinic description copied exactly/);
  assert.doesNotMatch(result.answer, /cures|guarantees/i);
});

test("invalid credentials degrade safely after provider authentication failure", async () => {
  const result = await answerReliably({
    locale: "en",
    knowledge: matchedKnowledge,
    configured: true,
    complete: async () => {
      throw Object.assign(new Error("invalid key secret must not escape"), {
        status: 401,
      });
    },
  });

  assert.equal(result.degraded, true);
  assert.doesNotMatch(result.answer, /invalid key secret/);
});

for (const failure of [
  { name: "timeout", error: new Error("timeout") },
  {
    name: "rate limit",
    error: Object.assign(new Error("rate limit"), { status: 429 }),
  },
  {
    name: "provider failure",
    error: Object.assign(new Error("overloaded"), { status: 529 }),
  },
]) {
  test(`${failure.name} returns approved matched content`, async () => {
    const result = await answerReliably({
      locale: "en",
      knowledge: matchedKnowledge,
      configured: true,
      complete: async () => {
        throw failure.error;
      },
    });

    assert.equal(result.degraded, true);
    assert.match(result.answer, /Approved clinic description copied exactly/);
  });
}

test("unmatched greeting explains supported topics without irrelevant sources", async () => {
  const result = await answerReliably({
    locale: "en",
    knowledge: unmatchedKnowledge,
    configured: false,
    complete: async () => "unexpected",
  });

  assert.match(
    result.answer,
    /treatments, products, booking, and clinic details/i,
  );
  assert.match(result.answer, /staff member/i);
  assert.deepEqual(result.sources, []);
});

test("fallback output is localized in English, Finnish, and Russian", () => {
  const en = groundedFallback("en", unmatchedKnowledge);
  const fi = groundedFallback("fi", unmatchedKnowledge);
  const ru = groundedFallback("ru", unmatchedKnowledge);

  assert.match(en, /I can help/);
  assert.match(fi, /Voin auttaa/);
  assert.match(ru, /Я могу помочь/);
  assert.notEqual(en, fi);
  assert.notEqual(fi, ru);
});

test("source links include only safe internal approved URLs", () => {
  assert.deepEqual(
    sourceLinks([
      { title: "Safe", body: "Approved", url: "/about" },
      { title: "External", body: "No", url: "https://example.com" },
      { title: "Protocol relative", body: "No", url: "//example.com" },
      { title: "Duplicate", body: "Approved", url: "/about" },
    ]),
    [{ title: "Safe", href: "/about" }],
  );
});
