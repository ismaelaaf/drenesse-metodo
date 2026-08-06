import { allowMethods, readJsonBody, sendJson } from "./_belle.js";
import { formatPhone, normalizeBrazilianMobile, validateMobile } from "../src/lib/domain.js";

const DEFAULT_BASE_URL = "https://api.app.leverconversas.com.br";
const DEFAULT_PANEL_ID = "929d58b8-2650-4993-9deb-b7aaa6481b3b";
const DEFAULT_STEP_ID = "0e0f41c7-0c7b-4576-b3bd-f62d42e74458";
const LANDING_SOURCE = "Landing Método Drenesse";

export function getLeverConfig() {
  return {
    token: process.env.LEVER_API_TOKEN || "",
    baseUrl: (process.env.LEVER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    panelId: process.env.LEVER_PANEL_ID || DEFAULT_PANEL_ID,
    stepId: process.env.LEVER_STEP_ID || DEFAULT_STEP_ID
  };
}

export function buildLeverCardPayload({ name, phone }, config = getLeverConfig()) {
  const normalizedPhone = normalizeBrazilianMobile(phone);
  return {
    title: String(name).trim(),
    description: `WhatsApp: +55 ${formatPhone(normalizedPhone)}\nOrigem: ${LANDING_SOURCE}`,
    panelId: config.panelId,
    stepId: config.stepId
  };
}

export async function createLeverCard(lead, { config = getLeverConfig(), fetcher = fetch } = {}) {
  if (!config.token) throw new Error("LEVER_API_TOKEN não configurado.");

  const url = `${config.baseUrl}/crm/v1/panel/card`;
  const body = buildLeverCardPayload(lead, config);
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const text = await response.text();

      if (response.ok) {
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch {
          return {};
        }
      }

      const error = new Error(`Lever API respondeu com status ${response.status}.`);
      error.statusCode = response.status;
      lastError = error;
      if (response.status < 500 && response.status !== 429) throw error;
    } catch (error) {
      lastError = error;
      if (error.statusCode && error.statusCode < 500 && error.statusCode !== 429) throw error;
    }
  }

  throw lastError || new Error("Não foi possível adicionar o lead à Lever.");
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
    const card = await createLeverCard({
      name: String(payload.name).trim(),
      phone: normalizeBrazilianMobile(payload.phone)
    });
    sendJson(res, 201, { ok: true, cardId: card?.id || "" });
  } catch {
    sendJson(res, 502, {
      ok: false,
      message: "Não foi possível registrar o contato no painel agora."
    });
  }
}
