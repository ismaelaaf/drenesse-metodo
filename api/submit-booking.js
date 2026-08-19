import {
  allowMethods,
  belleFetch,
  buildBenefitUsedWhatsapp,
  buildFallbackWhatsapp,
  buildObservation,
  extractClientCode,
  getServerConfig,
  readJsonBody,
  sendJson
} from "./_belle.js";
import {
  PROMOTION,
  SELLER,
  UNITS,
  getObjective,
  getUnit,
  getWorkRoutine,
  normalizeBrazilianMobile,
  validateMobile
} from "../src/lib/domain.js";

export const BOOKING_ENDPOINT = "/agenda/gravar";

/* A Belle recusa por regra de negócio com HTTP 200 e `sucesso:false`, então o
   status da resposta não serve para decidir. Só `dis` confirma a gravação. */
export function isBookingConfirmed(booking) {
  if (!booking || typeof booking !== "object") return false;
  if (booking.sucesso === false) return false;
  return Boolean(booking.dis);
}

export function describeBelleError(error) {
  const detail = error?.data?.msg || error?.data?.mensagem || error?.message || "";
  return error?.statusCode ? `HTTP ${error.statusCode}: ${detail}` : detail;
}

function logBookingOutcome(stage, detail) {
  console.log(JSON.stringify({ tag: "agendamento", stage, ...detail }));
}

export async function findExistingClientByPhone(phone, preferredUnitCode, fetcher = belleFetch) {
  const normalizedPhone = normalizeBrazilianMobile(phone);
  const orderedUnitCodes = [
    Number(preferredUnitCode),
    ...UNITS.map((unit) => unit.code).filter((code) => code !== Number(preferredUnitCode))
  ];

  for (const unitCode of orderedUnitCodes) {
    const client = await fetcher("/cliente/listar", {
      query: {
        cpf: "",
        id: "",
        codEstab: unitCode,
        email: "",
        celular: normalizedPhone
      }
    });
    const clientCode = extractClientCode(client);
    if (clientCode) return { clientCode, unitCode };
  }

  return null;
}

export function buildBookingBody({ leadCode, unit, payload, observation }) {
  return {
    codCli: Number(leadCode),
    codEstab: unit.code,
    prof: {
      cod_usuario: String(payload.slot.professionalCode),
      nom_usuario: payload.slot.professionalName || "Profissional Drenesse"
    },
    dtAgd: payload.slot.date,
    hri: payload.slot.time,
    serv: [
      {
        codServico: PROMOTION.serviceCode,
        nome: PROMOTION.serviceName,
        tempo: PROMOTION.duration,
        label: PROMOTION.serviceLabel,
        codSaldo: "",
        usaDia: "",
        diaRetorno: 0
      }
    ],
    codPlano: "",
    agSala: false,
    codSala: 0,
    codVendedor: SELLER.code,
    observacao: observation
  };
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Payload inválido.";
  if (!payload.name || String(payload.name).trim().length < 2) return "Nome inválido.";
  const phoneError = validateMobile(payload.phone);
  if (phoneError) return phoneError;
  if (!getUnit(payload.unitCode)) return "Unidade inválida.";
  if (!getObjective(payload.objectiveId)) return "Objetivo inválido.";
  if (!getWorkRoutine(payload.workRoutineId)) return "Rotina inválida.";
  if (!payload.slot?.date || !payload.slot?.time || !payload.slot?.professionalCode) {
    return "Horário inválido.";
  }
  return "";
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

  const validation = validatePayload(payload);
  if (validation) {
    sendJson(res, 400, { message: validation });
    return;
  }

  const config = getServerConfig();
  const unit = getUnit(payload.unitCode);
  const objective = getObjective(payload.objectiveId);
  const workRoutine = getWorkRoutine(payload.workRoutineId);
  const phone = normalizeBrazilianMobile(payload.phone);
  const observation = buildObservation({
    name: payload.name,
    phone,
    unit,
    objective,
    workRoutine,
    slot: payload.slot,
    tracking: payload.tracking || {}
  });

  let existingRegistration;
  try {
    existingRegistration = await findExistingClientByPhone(phone, unit.code);
  } catch {
    sendJson(res, 503, {
      message: "Não conseguimos validar seu WhatsApp agora. Tente novamente em alguns instantes."
    });
    return;
  }

  if (existingRegistration) {
    sendJson(res, 200, {
      ok: false,
      bookingStatus: "ineligible",
      reason: "benefit-used",
      whatsappUrl: buildBenefitUsedWhatsapp(),
      message: "Este WhatsApp já está cadastrado e o benefício é limitado a uma utilização por pessoa."
    });
    return;
  }

  const fallbackResponse = (extra) => ({
    ok: false,
    bookingStatus: "fallback",
    bookingMessage: "A equipe vai confirmar o melhor horário.",
    whatsappUrl: buildFallbackWhatsapp({ ...payload, phone }, "fallback"),
    ...extra
  });

  let createdLead;
  try {
    createdLead = await belleFetch("/cliente/gravar-lead", {
      method: "POST",
      body: {
        nome: String(payload.name).trim(),
        ddiCelular: "+55",
        celular: phone,
        email: "",
        cpf: "",
        observacao: observation,
        tpOrigem: "Campanha",
        codOrigem: config.originCode,
        codEstab: unit.code
      }
    });
  } catch (error) {
    logBookingOutcome("lead-error", { phone, unit: unit.code, belle: describeBelleError(error) });
    sendJson(res, 200, fallbackResponse({
      leadStatus: "failed",
      message: "Cadastro recebido. Vamos confirmar os detalhes pelo WhatsApp."
    }));
    return;
  }

  const leadCode = extractClientCode(createdLead);

  if (!leadCode) {
    logBookingOutcome("lead-no-code", { phone, unit: unit.code, belle: createdLead?.msg || "" });
    sendJson(res, 200, fallbackResponse({
      leadStatus: "failed",
      message: "Cadastro recebido. Vamos confirmar os detalhes pelo WhatsApp."
    }));
    return;
  }

  const attempt = {
    phone,
    leadCode,
    unit: unit.code,
    slot: `${payload.slot.date} ${payload.slot.time}`,
    prof: String(payload.slot.professionalCode)
  };

  try {
    const booking = await belleFetch(BOOKING_ENDPOINT, {
      method: "POST",
      body: buildBookingBody({ leadCode, unit, payload, observation })
    });

    const bookingCode = booking?.codAgendamento || booking?.codigo || "";
    const confirmed = isBookingConfirmed(booking);

    logBookingOutcome(confirmed ? "booked" : "refused", {
      ...attempt,
      bookingCode,
      belle: booking?.msg || ""
    });

    sendJson(res, 200, {
      ok: confirmed,
      leadCode,
      leadStatus: "created",
      bookingStatus: confirmed ? "confirmed" : "fallback",
      bookingCode,
      bookingMessage: confirmed ? "Sessão do Método Drenesse registrada." : "A equipe vai confirmar o melhor horário.",
      whatsappUrl: buildFallbackWhatsapp(
        { ...payload, phone },
        confirmed ? "confirmed" : "fallback",
        bookingCode
      )
    });
  } catch (error) {
    logBookingOutcome("booking-error", { ...attempt, belle: describeBelleError(error) });
    sendJson(res, 200, fallbackResponse({ leadCode, leadStatus: "created" }));
  }
}
