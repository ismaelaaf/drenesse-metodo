import assert from "node:assert/strict";
import {
  buildLeverCardPayload,
  buildLeverContactPayload,
  buildLeverScheduledPayload,
  captureLeverLead,
  createLeverCard,
  moveLeverCardToScheduled
} from "../api/capture-lead.js";
import { markLeverCardScheduled } from "../api/submit-booking.js";

const config = {
  token: "test-token",
  baseUrl: "https://api.app.leverconversas.com.br",
  panelId: "a3ee4cf3-291f-4c8f-8535-e3414642951a",
  stepId: "44586803-6791-41fd-b95a-826902688a25",
  scheduledStepId: "4706f31a-feb2-4726-aea7-e0eaf57c7125"
};

const scheduledCardId = "0d6f1a8e-3b2c-4d5e-8f70-1a2b3c4d5e6f";
const scheduledDetails = {
  cardId: scheduledCardId,
  phone: "84988307853",
  slot: { date: "09/10/2026", time: "14:00" },
  unit: { name: "Drenesse Petrópolis" }
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function scheduledFetcher(calls, card) {
  return async (url, request) => {
    calls.push({ url, method: request.method, body: request.body ? JSON.parse(request.body) : undefined });
    if (url.endsWith("/core/v1/contact/filter")) {
      return jsonResponse({ items: [{ id: "contact-123", phoneNumber: "+55|84988307853" }] });
    }
    if (url.endsWith(`/crm/v2/panel/card/${scheduledCardId}`)) return jsonResponse(card);
    if (url.endsWith(`/crm/v3/panel/card/${scheduledCardId}`)) return jsonResponse({ id: scheduledCardId });
    throw new Error(`Unexpected URL: ${url}`);
  };
}

assert.deepEqual(
  buildLeverScheduledPayload(
    { description: "WhatsApp: +55 (84) 9 8830-7853\nOrigem: Landing Método Drenesse", ...scheduledDetails },
    config
  ),
  {
    fields: ["Description", "StepId"],
    description: "WhatsApp: +55 (84) 9 8830-7853\nOrigem: Landing Método Drenesse\nAgendado: 09/10/2026 14:00 - Drenesse Petrópolis",
    stepId: "4706f31a-feb2-4726-aea7-e0eaf57c7125"
  }
);

// Reenvio não duplica a linha do agendamento.
assert.equal(
  buildLeverScheduledPayload(
    { description: "Origem: X\nAgendado: 09/10/2026 14:00 - Drenesse Petrópolis", ...scheduledDetails },
    config
  ).description,
  "Origem: X\nAgendado: 09/10/2026 14:00 - Drenesse Petrópolis"
);

{
  const calls = [];
  await moveLeverCardToScheduled(scheduledDetails, {
    config,
    fetcher: scheduledFetcher(calls, {
      id: scheduledCardId,
      panelId: config.panelId,
      contactIds: ["contact-123"],
      description: "Origem: Landing Método Drenesse"
    })
  });
  const update = calls.find((call) => call.method === "PUT");
  assert.equal(update.url, `${config.baseUrl}/crm/v3/panel/card/${scheduledCardId}`);
  assert.equal(update.body.stepId, config.scheduledStepId);
  assert.deepEqual(update.body.fields, ["Description", "StepId"]);
}

for (const card of [
  { id: scheduledCardId, panelId: "929d58b8-2650-4993-9deb-b7aaa6481b3b", contactIds: ["contact-123"] },
  { id: scheduledCardId, panelId: config.panelId, contactIds: ["other-contact"] }
]) {
  const calls = [];
  await assert.rejects(
    moveLeverCardToScheduled(scheduledDetails, { config, fetcher: scheduledFetcher(calls, card) }),
    /não pertence a este contato e painel/
  );
  assert.equal(calls.some((call) => call.method === "PUT"), false);
}

{
  let moved = 0;
  assert.equal(await markLeverCardScheduled({ ...scheduledDetails, cardId: "" }, async () => { moved += 1; }), false);
  assert.equal(await markLeverCardScheduled({ ...scheduledDetails, cardId: "<script>" }, async () => { moved += 1; }), false);
  assert.equal(moved, 0);
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(await markLeverCardScheduled(scheduledDetails, async () => { throw new Error("Lever fora"); }), false);
    // Lever travada não segura a resposta do agendamento.
    assert.equal(await markLeverCardScheduled(scheduledDetails, () => new Promise(() => {}), 20), false);
  } finally {
    console.error = originalError;
  }
  assert.equal(await markLeverCardScheduled(scheduledDetails, async () => { moved += 1; }), true);
  assert.equal(moved, 1);
}

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
