import {
  PROMOTION,
  SELLER,
  buildWhatsAppUrl,
  getObjective,
  getUnit,
  getWorkRoutine,
  normalizeBrazilianMobile,
  toBelleDate
} from "../src/lib/domain.js";

const DEFAULT_BASE_URL = "https://app.bellesoftware.com.br/api/release/controller/IntegracaoExterna/v1.0";
const DEFAULT_WHATSAPP_NUMBER = "5584988307853";

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function allowMethods(req, res, methods) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    sendJson(res, 204, {});
    return false;
  }

  if (!methods.includes(req.method)) {
    sendJson(res, 405, { message: "Método não permitido." });
    return false;
  }

  return true;
}

export function getServerConfig() {
  return {
    token: process.env.BELLE_API_TOKEN || "",
    baseUrl: (process.env.BELLE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    whatsappNumber: process.env.WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER,
    originCode: process.env.BELLE_ORIGIN_CODE || "1"
  };
}

export function normalizeDateParam(value) {
  if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(String(value))) return String(value);
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) return toBelleDate(value);
  return toBelleDate(new Date());
}

export function getQuery(req, key) {
  if (req.query && req.query[key] !== undefined) return req.query[key];
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get(key);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function belleFetch(path, { method = "GET", query, body } = {}) {
  const { token, baseUrl } = getServerConfig();
  if (!token) {
    const error = new Error("BELLE_API_TOKEN não configurado.");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value ?? "");
  });

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(`Belle retornou HTTP ${response.status}.`);
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function flattenAvailability(rawAvailability) {
  const days = Array.isArray(rawAvailability) ? rawAvailability : rawAvailability ? [rawAvailability] : [];

  return days.map((day) => {
    const professionals = Array.isArray(day.horarios) ? day.horarios : [];
    const slots = professionals.flatMap((professional) => {
      const professionalSlots = Array.isArray(professional.horarios) ? professional.horarios : [];
      return professionalSlots
        .filter((slot) => {
          const status = String(slot.bloq || slot.cod || "").toLowerCase();
          return !status || status === "l";
        })
        .map((slot) => ({
          id: `${day.data}-${slot.horario}-${professional.codProf || professional.cod_prof || professional.codigo}`,
          date: day.data,
          time: slot.horario,
          professionalCode: String(professional.codProf || professional.cod_prof || professional.codigo || ""),
          professionalName: professional.nome || "Profissional Drenesse",
          interval: professional.tempo_intervalo || "",
          shiftCode: slot.turno || "",
          raw: {
            cod: slot.cod || "",
            bloq: slot.bloq || ""
          }
        }));
    });

    return {
      name: day.nome || "",
      date: day.data || "",
      availabilityText: day.disp || "",
      slots
    };
  });
}

export function extractClientCode(data) {
  if (Array.isArray(data)) return data.map(extractClientCode).find(Boolean) || "";
  if (!data || typeof data !== "object") return "";
  return String(data.codigo || data.codCliente || data.cod_cliente || "");
}

export function buildObservation({ name, phone, unit, objective, workRoutine, slot, tracking }) {
  const lines = [
    "Landing Campanha Método Drenesse",
    `Serviço: ${PROMOTION.serviceLabel}`,
    `Duração: ${PROMOTION.duration} minutos`,
    `Campanha: de ${PROMOTION.regularPrice} por ${PROMOTION.promotionalPrice}`,
    `Nome: ${name}`,
    `WhatsApp: ${phone}`,
    `Unidade: ${unit?.name || ""}`,
    `Objetivo: ${objective?.label || ""}`,
    `Rotina: ${workRoutine?.label || ""}`,
    `Vendedor: ${SELLER.name}`,
    `Preferência: ${slot?.date || ""} ${slot?.time || ""}`,
    `Página: ${tracking?.page || ""}`,
    `UTM source: ${tracking?.utm_source || ""}`,
    `UTM campaign: ${tracking?.utm_campaign || ""}`
  ];

  return lines.filter(Boolean).join(" | ");
}

export function buildFallbackWhatsapp(payload, bookingStatus = "fallback", bookingCode = "") {
  const { whatsappNumber } = getServerConfig();
  const unit = getUnit(payload.unitCode);
  const objective = getObjective(payload.objectiveId);
  const workRoutine = getWorkRoutine(payload.workRoutineId);
  return buildWhatsAppUrl({
    number: whatsappNumber,
    name: payload.name,
    phone: normalizeBrazilianMobile(payload.phone),
    unit,
    objective,
    workRoutine,
    slot: payload.slot,
    bookingStatus,
    bookingCode
  });
}
