import assert from "node:assert/strict";
import {
  buildLeverCardPayload,
  buildLeverContactPayload,
  captureLeverLead,
  createLeverCard
} from "../api/capture-lead.js";

const config = {
  token: "test-token",
  baseUrl: "https://api.app.leverconversas.com.br",
  panelId: "929d58b8-2650-4993-9deb-b7aaa6481b3b",
  stepId: "0e0f41c7-0c7b-4576-b3bd-f62d42e74458"
};

const lead = { name: " Maria da Silva ", phone: "+55 (84) 9 8830-7853" };

assert.deepEqual(buildLeverContactPayload(lead), {
  name: "Maria da Silva",
  phoneNumber: "+55|84988307853"
});

const cardPayload = buildLeverCardPayload(
  { ...lead, contactId: "contact-123" },
  config
);

assert.deepEqual(cardPayload, {
  title: "Maria da Silva",
  description: "WhatsApp: +55 (84) 9 8830-7853\nOrigem: Landing Método Drenesse",
  panelId: config.panelId,
  stepId: config.stepId,
  contactIds: ["contact-123"]
});

assert.throws(
  () => buildLeverCardPayload(lead, config),
  /precisa estar vinculado a um contato/
);

{
  const calls = [];
  const result = await captureLeverLead(lead, {
    config,
    fetcher: async (url, request) => {
      calls.push({ url, request, body: JSON.parse(request.body) });
      if (url.endsWith("/core/v1/contact/filter")) {
        return new Response(
          JSON.stringify({
            items: [{ id: "existing-contact", phoneNumber: "+55|84988307853" }]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/crm/v1/panel/card")) {
        return new Response(JSON.stringify({ id: "card-existing" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }
  });

  assert.equal(result.contact.id, "existing-contact");
  assert.equal(result.card.id, "card-existing");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body, {
    phoneNumber: "84988307853",
    status: "ACTIVE",
    pageNumber: 1,
    pageSize: 10
  });
  assert.deepEqual(calls[1].body.contactIds, ["existing-contact"]);
}

{
  const filterStatuses = [];
  let contactRequest;
  let cardRequest;
  const result = await captureLeverLead(lead, {
    config,
    fetcher: async (url, request) => {
      const body = JSON.parse(request.body);
      if (url.endsWith("/core/v1/contact/filter")) {
        filterStatuses.push(body.status);
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.endsWith("/core/v1/contact")) {
        contactRequest = body;
        return new Response(
          JSON.stringify({ id: "new-contact", phoneNumber: "+55|84988307853" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/crm/v1/panel/card")) {
        cardRequest = body;
        return new Response(JSON.stringify({ id: "card-new" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }
  });

  assert.deepEqual(filterStatuses, ["ACTIVE", "ARCHIVED", "BLOCKED"]);
  assert.deepEqual(contactRequest, {
    name: "Maria da Silva",
    phoneNumber: "+55|84988307853"
  });
  assert.deepEqual(cardRequest.contactIds, ["new-contact"]);
  assert.equal(result.contact.id, "new-contact");
  assert.equal(result.card.id, "card-new");
}

{
  let attempts = 0;
  let receivedRequest;
  const card = await createLeverCard(
    { name: "Maria da Silva", phone: "84988307853", contactId: "contact-123" },
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
  assert.deepEqual(JSON.parse(receivedRequest.request.body).contactIds, ["contact-123"]);
  assert.equal(card.id, "card-123");
}

console.log("Lever contact and card capture tests passed.");
