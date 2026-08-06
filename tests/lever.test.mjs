import assert from "node:assert/strict";
import { buildLeverCardPayload, createLeverCard } from "../api/capture-lead.js";

const config = {
  token: "test-token",
  baseUrl: "https://api.app.leverconversas.com.br",
  panelId: "929d58b8-2650-4993-9deb-b7aaa6481b3b",
  stepId: "0e0f41c7-0c7b-4576-b3bd-f62d42e74458"
};

const payload = buildLeverCardPayload(
  { name: " Maria da Silva ", phone: "+55 (84) 9 8830-7853" },
  config
);

assert.deepEqual(payload, {
  title: "Maria da Silva",
  description: "WhatsApp: +55 (84) 9 8830-7853\nOrigem: Landing Método Drenesse",
  panelId: config.panelId,
  stepId: config.stepId
});

let attempts = 0;
let receivedRequest;
const card = await createLeverCard(
  { name: "Maria da Silva", phone: "84988307853" },
  {
    config,
    fetcher: async (url, request) => {
      attempts += 1;
      receivedRequest = { url, request };
      if (attempts === 1) return new Response("temporarily unavailable", { status: 503 });
      return new Response(JSON.stringify({ id: "card-123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
);

assert.equal(attempts, 2);
assert.equal(receivedRequest.url, "https://api.app.leverconversas.com.br/crm/v1/panel/card");
assert.equal(receivedRequest.request.method, "POST");
assert.equal(receivedRequest.request.headers.Authorization, "Bearer test-token");
assert.deepEqual(JSON.parse(receivedRequest.request.body), payload);
assert.equal(card.id, "card-123");

console.log("Lever capture tests passed.");
