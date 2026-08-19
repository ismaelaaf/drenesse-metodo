import assert from "node:assert/strict";
import {
  PROMOTION,
  buildWhatsAppUrl,
  formatPhone,
  getObjective,
  getUnit,
  getWorkRoutine,
  normalizeBrazilianMobile,
  toBelleDate,
  validateMobile,
  isWholeHour
} from "../src/lib/domain.js";
import { buildLeadTypebotEvent, pushLeadTypebotEvent } from "../src/lib/tracking.js";

assert.equal(normalizeBrazilianMobile("+55 (84) 9 8830-7853"), "84988307853");
assert.equal(formatPhone("84988307853"), "(84) 9 8830-7853");
assert.equal(validateMobile("84988307853"), null);
assert.match(validateMobile("8488307853"), /Faltam|Falta o 9/);
assert.equal(getUnit(2).shortName, "Lagoa Nova");
assert.equal(getObjective("facial").belleObservationCode, 2);
assert.equal(getWorkRoutine("em-pe").label, "Trabalho em pé");
assert.equal(toBelleDate("2026-07-09"), "09/07/2026");
assert.equal(PROMOTION.serviceCode, 22);
assert.equal(PROMOTION.duration, 60);

assert.deepEqual(
  buildLeadTypebotEvent({
    name: "  Maria da Silva  ",
    phone: "(84) 9 8830-7853"
  }),
  {
    event: "lead-typebot",
    name: "Maria da Silva",
    phone: "+5584988307853"
  }
);

const trackingTarget = {};
pushLeadTypebotEvent(
  { name: "Maria da Silva", phone: "84988307853" },
  trackingTarget
);
assert.equal(trackingTarget.dataLayer.length, 1);
assert.equal(trackingTarget.dataLayer[0].event, "lead-typebot");

const url = buildWhatsAppUrl({
  number: "5584988307853",
  name: "Maria",
  phone: "84988307853",
  unit: getUnit(1),
  objective: getObjective("corporal"),
  workRoutine: getWorkRoutine("sentado"),
  slot: { date: "09/07/2026", time: "15:00" },
  bookingStatus: "confirmed",
  bookingCode: 123
});

assert.ok(url.startsWith("https://wa.me/5584988307853?text="));
assert.ok(decodeURIComponent(url).includes("Drenesse Petrópolis"));
assert.ok(decodeURIComponent(url).includes("Trabalho sentado(a)"));
assert.ok(decodeURIComponent(url).includes("09/07/2026 às 15:00"));
assert.ok(decodeURIComponent(url).includes("R$ 89,90"));
assert.ok(decodeURIComponent(url).includes("DRENAGEM MÉTODO DRENESSE"));

const noAvailabilityUrl = buildWhatsAppUrl({
  number: "5584988307853",
  name: "Maria",
  unit: getUnit(1),
  objective: getObjective("corporal"),
  workRoutine: getWorkRoutine("sentado"),
  reason: "no-availability",
  range: { startDate: "09/07/2026", endDate: "14/07/2026" }
});
const noAvailabilityMessage = decodeURIComponent(noAvailabilityUrl);
assert.ok(noAvailabilityMessage.includes("09/07/2026 a 14/07/2026"));
assert.ok(noAvailabilityMessage.includes("encaixes ou novas vagas"));
assert.ok(noAvailabilityMessage.includes("Drenesse Petrópolis"));

const generalContactUrl = buildWhatsAppUrl({
  number: "5584988307853",
  reason: "general-contact"
});
assert.ok(decodeURIComponent(generalContactUrl).includes("gostaria de mais informações"));
assert.ok(!decodeURIComponent(generalContactUrl).includes("undefined"));

console.log("Form/domain tests passed.");

// Hora fechada
assert.equal(isWholeHour("15:00"), true);
assert.equal(isWholeHour("9:00"), true);
assert.equal(isWholeHour("14:05"), false);
assert.equal(isWholeHour("15:30"), false);
assert.equal(isWholeHour(""), false);
assert.equal(isWholeHour(undefined), false);
console.log("Whole-hour domain tests passed.");
