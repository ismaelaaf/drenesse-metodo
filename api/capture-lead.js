import { allowMethods, readJsonBody, sendJson } from "./_belle.js";
import { formatPhone, normalizeBrazilianMobile, validateMobile } from "../src/lib/domain.js";

const DEFAULT_BASE_URL = "https://api.app.leverconversas.com.br";
const DEFAULT_PANEL_ID = "a3ee4cf3-291f-4c8f-8535-e3414642951a";
const DEFAULT_STEP_ID = "44586803-6791-41fd-b95a-826902688a25";
const LANDING_SOURCE = "Landing Método Drenesse";

export function getLeverConfig() {
  return {
    token: process.env.LEVER_API_TOKEN || "",
    baseUrl: (process.env.LEVER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    panelId: process.env.LEVER_PANEL_ID || DEFAULT_PANEL_ID,
    stepId: process.env.LEVER_STEP_ID || DEFAULT_STEP_ID
  };
}

function getLeverHeaders(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json"
  };
}

function getResponseEntity(payload) {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}

async function requestLeverJson(
  url,
  { method = "GET", body, config = getLeverConfig(), fetcher = fetch, retries = 1 } = {}
) {
  if (!config.token) throw new Error("LEVER_API_TOKEN não configurado.");

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetcher(url, {
        method,
        headers: getLeverHeaders(config),
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const text = await response.text();
      let payload = {};
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = {};
        }
      }

      if (response.ok) return payload;

      const error = new Error(`Lever API respondeu com status ${response.status}.`);
      error.statusCode = response.status;
      error.payload = payload;
      lastError = error;
      if (response.status < 500 && response.status !== 429) throw error;
    } catch (error) {
      lastError = error;
      if (error.statusCode && error.statusCode < 500 && error.statusCode !== 429) throw error;
    }
  }

  throw lastError || new Error("Não foi possível acessar a Lever.");
}

export function buildLeverContactPayload({ name, phone }) {
  return {
    name: String(name).trim(),
    phoneNumber: `+55|${normalizeBrazilianMobile(phone)}`
  };
}

export function buildLeverCardPayload({ name, phone, contactId }, config = getLeverConfig()) {
  if (!contactId) throw new Error("O card da Lever precisa estar vinculado a um contato.");
  const normalizedPhone = normalizeBrazilianMobile(phone);
  return {
    title: String(name).trim(),
    description: `WhatsApp: +55 ${formatPhone(normalizedPhone)}\nOrigem: ${LANDING_SOURCE}`,
    panelId: config.panelId,
    stepId: config.stepId,
    contactIds: [String(contactId)]
  };
}

export async function findLeverContactByPhone(
  phone,
  { config = getLeverConfig(), fetcher = fetch } = {}
) {
  const normalizedPhone = normalizeBrazilianMobile(phone);
  const url = `${config.baseUrl}/core/v1/contact/filter`;

  for (const status of ["ACTIVE", "ARCHIVED", "BLOCKED"]) {
    const payload = await requestLeverJson(url, {
      method: "POST",
      body: {
        phoneNumber: normalizedPhone,
        status,
        pageNumber: 1,
        pageSize: 10
      },
      config,
      fetcher
    });
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const contact = items.find((item) => {
      const itemPhone = item?.phoneNumber || item?.phonenumber || "";
      return normalizeBrazilianMobile(itemPhone) === normalizedPhone;
    });
    if (contact?.id) return contact;
  }

  return null;
}

export async function createLeverContact(
  lead,
  { config = getLeverConfig(), fetcher = fetch } = {}
) {
  const payload = await requestLeverJson(`${config.baseUrl}/core/v1/contact`, {
    method: "POST",
    body: buildLeverContactPayload(lead),
    config,
    fetcher,
    retries: 0
  });
  const contact = getResponseEntity(payload);
  if (!contact?.id) throw new Error("A Lever não retornou o identificador do contato.");
  return contact;
}

export async function ensureLeverContact(
  lead,
  { config = getLeverConfig(), fetcher = fetch } = {}
) {
  const existingContact = await findLeverContactByPhone(lead.phone, { config, fetcher });
  if (existingContact) return existingContact;

  try {
    return await createLeverContact(lead, { config, fetcher });
  } catch (error) {
    const contactCreatedByAnotherRequest = await findLeverContactByPhone(lead.phone, {
      config,
      fetcher
    });
    if (contactCreatedByAnotherRequest) return contactCreatedByAnotherRequest;
    throw error;
  }
}

export async function createLeverCard(lead, { config = getLeverConfig(), fetcher = fetch } = {}) {
  const payload = await requestLeverJson(`${config.baseUrl}/crm/v1/panel/card`, {
    method: "POST",
    body: buildLeverCardPayload(lead, config),
    config,
    fetcher
  });
  return getResponseEntity(payload);
}

export async function captureLeverLead(
  lead,
  { config = getLeverConfig(), fetcher = fetch } = {}
) {
  const contact = await ensureLeverContact(lead, { config, fetcher });
  const card = await createLeverCard(
    { ...lead, contactId: contact.id },
    { config, fetcher }
  );
  return { contact, card };
}

function validateLead(payload) {
  if (!payload || typeof payload !== "object") return "Payload inválido.";
  if (!payload.name || String(payload.name).trim().length < 2) return "Nome inválido.";
  return validateMobile(payload.phone) || "";
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { message: "JSON inválido." });
    return;
  }

  const validation = validateLead(payload);
  if (validation) {
    sendJson(res, 400, { message: validation });
    return;
  }

  try {
    const { contact, card } = await captureLeverLead({
      name: String(payload.name).trim(),
      phone: normalizeBrazilianMobile(payload.phone)
    });
    sendJson(res, 201, {
      ok: true,
      contactId: contact?.id || "",
      cardId: card?.id || ""
    });
  } catch {
    sendJson(res, 502, {
      ok: false,
      message: "Não foi possível registrar o contato no painel agora."
    });
  }
}
