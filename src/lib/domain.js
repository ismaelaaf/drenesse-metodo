export const UNITS = [
  {
    code: 1,
    shortName: "Petrópolis",
    name: "Drenesse Petrópolis",
    address: "Rua Trairi, 661 - Petrópolis",
    phone: "(84) 2040-0307"
  },
  {
    code: 2,
    shortName: "Lagoa Nova",
    name: "Drenesse Lagoa Nova",
    address: "Av. Amintas Barros, 3130 - Lagoa Nova",
    phone: "(84) 2020-7722"
  },
  {
    code: 3,
    shortName: "Capim Macio",
    name: "Drenesse Capim Macio",
    address: "Rua Olacildo Ximenes Jales, 1935 - Capim Macio",
    phone: "(84) 3113-5986"
  },
  {
    code: 6,
    shortName: "Norte Shopping",
    name: "Drenesse Norte Shopping",
    address: "Av. Dr. João Medeiros Filho, 2395 - Potengi",
    phone: ""
  }
];

export const PROMOTION = Object.freeze({
  serviceCode: 22,
  serviceName: "DRENAGEM MÉTODO DRENESSE",
  serviceLabel: "22 - DRENAGEM MÉTODO DRENESSE",
  duration: 60,
  regularPrice: "R$ 159,90",
  promotionalPrice: "R$ 89,90",
  campaignLabel: "Campanha de R$ 159,90 por R$ 89,90"
});

export const SELLER = Object.freeze({
  code: "99915",
  name: "Ismael Anderson de Araújo Figueiredo"
});

export const OBJECTIVES = [
  {
    id: "corporal",
    title: "Corporal",
    label: "Corporal",
    belleObservationCode: 1,
    description: "Gordura localizada, flacidez, celulite, estrias ou retenção."
  },
  {
    id: "facial",
    title: "Facial",
    label: "Facial",
    belleObservationCode: 2,
    description: "Manchas, acne, rejuvenescimento, bioestímulo ou textura da pele."
  },
  {
    id: "corporal-facial",
    title: "Corporal e facial",
    label: "Corporal e facial",
    belleObservationCode: 4,
    description: "Quero avaliar mais de uma queixa na consulta."
  }
];

export const WORK_ROUTINES = [
  {
    id: "em-pe",
    title: "Trabalho em pé",
    label: "Trabalho em pé",
    description: "Passo boa parte da rotina em pé ou me movimentando."
  },
  {
    id: "sentado",
    title: "Trabalho sentado(a)",
    label: "Trabalho sentado(a)",
    description: "Passo boa parte da rotina sentada ou em posição fixa."
  },
  {
    id: "sem-ocupacao",
    title: "Sem ocupação",
    label: "Sem ocupação",
    description: "No momento não atuo em uma ocupação fixa."
  }
];

export const FORM_STEPS = [
  { key: "dados", label: "Dados" },
  { key: "unidade", label: "Unidade" },
  { key: "objetivo", label: "Objetivo" },
  { key: "rotina", label: "Rotina" },
  { key: "horario", label: "Horário" }
];

export function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export function normalizeBrazilianMobile(value = "") {
  let digits = onlyDigits(value);
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  return digits.slice(0, 11);
}

export function formatPhone(value = "") {
  const digits = normalizeBrazilianMobile(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function validateMobile(value = "") {
  const digits = normalizeBrazilianMobile(value);
  if (!digits) return "Digite seu WhatsApp com DDD.";
  if (digits.length < 11) return "Faltam números. Digite DDD + WhatsApp.";
  if (digits.length > 11) return "Tem números a mais. Confira seu WhatsApp.";
  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (!Number.isFinite(ddd) || ddd < 11 || ddd > 99) return "DDD inválido. Confira os 2 primeiros números.";
  if (digits[2] !== "9") return "Falta o 9 antes do número. Ex: (84) 9 9999-9999.";
  return null;
}

export function getUnit(code) {
  return UNITS.find((unit) => Number(unit.code) === Number(code)) || null;
}

export function getObjective(id) {
  return OBJECTIVES.find((objective) => objective.id === id) || null;
}

export function getWorkRoutine(id) {
  return WORK_ROUTINES.find((routine) => routine.id === id) || null;
}

/* A campanha só agenda em hora fechada. A Belle devolve a agenda na
   granularidade do `tempo_intervalo` do profissional — de 5 em 5 minutos para
   alguns —, o que ofereceria dezenas de inícios sobrepostos para uma sessão de
   60 minutos e fragmentaria o dia de quem atende. */
export function isWholeHour(time = "") {
  return /^\d{1,2}:00$/.test(String(time).trim());
}

export function toBelleDate(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T00:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function fromBelleDate(date = "") {
  const [day, month, year] = String(date).split("/");
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function formatLongDate(date = "") {
  const iso = fromBelleDate(date);
  if (!iso) return date;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(`${iso}T12:00:00`));
}

export function buildWhatsAppUrl({
  number,
  name,
  phone,
  unit,
  objective,
  workRoutine,
  slot,
  bookingStatus,
  bookingCode,
  reason = "",
  range
}) {
  const unitName = unit?.name || "Unidade a confirmar";
  const objectiveLabel = objective?.label || "Objetivo a confirmar";
  const workRoutineLabel = workRoutine?.label || "Rotina a confirmar";
  const desiredTime = slot?.date && slot?.time ? `${slot.date} às ${slot.time}` : "Horário a confirmar";
  const rangeLabel = range?.startDate && range?.endDate ? `${range.startDate} a ${range.endDate}` : "nos próximos dias";
  const reasonMessages = {
    "no-availability": `Não encontrei horários online para o Método Drenesse entre ${rangeLabel} e gostaria de verificar encaixes ou novas vagas.`,
    "availability-partial": `A busca de horários do Método Drenesse não conseguiu verificar todo o período de ${rangeLabel}. Gostaria de confirmar as opções com o atendimento.`,
    "availability-error": "Não consegui carregar os horários do Método Drenesse e gostaria de verificar a agenda com o atendimento."
  };
  const isGeneralContact = reason === "general-contact";
  const message = [
    isGeneralContact
      ? "Olá, equipe Drenesse! Vim pela landing e gostaria de mais informações."
      : `Olá, equipe Drenesse! Vim pela campanha do Método Drenesse por ${PROMOTION.promotionalPrice} e gostaria de confirmar meu atendimento.`,
    reasonMessages[reason] || "",
    !isGeneralContact ? `Oferta: ${PROMOTION.serviceName} - de ${PROMOTION.regularPrice} por ${PROMOTION.promotionalPrice}.` : "",
    name ? `Nome: ${name}` : "",
    unit ? `Unidade: ${unitName}` : "",
    objective ? `Objetivo: ${objectiveLabel}` : "",
    workRoutine ? `Rotina: ${workRoutineLabel}` : "",
    !isGeneralContact ? `Preferência: ${desiredTime}` : "",
    bookingCode ? `Código do agendamento: ${bookingCode}` : ""
  ].filter(Boolean).join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
