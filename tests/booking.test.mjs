import assert from "node:assert/strict";
import { buildObservation } from "../api/_belle.js";
import { BOOKING_ENDPOINT, buildBookingBody } from "../api/submit-booking.js";
import { PROMOTION, getObjective, getUnit, getWorkRoutine } from "../src/lib/domain.js";

const payload = {
  slot: {
    date: "10/07/2026",
    time: "14:30",
    professionalCode: "42",
    professionalName: "Profissional Teste"
  }
};

const body = buildBookingBody({
  leadCode: "1234",
  unit: getUnit(1),
  objective: getObjective("corporal"),
  payload,
  observation: "Campanha de teste"
});

assert.equal(BOOKING_ENDPOINT, "/agenda/gravar");
assert.equal(body.codCli, 1234);
assert.equal(body.codEstab, 1);
assert.equal(body.agSala, false);
assert.equal(body.serv.length, 1);
assert.equal(body.serv[0].codServico, PROMOTION.serviceCode);
assert.equal(body.serv[0].nome, "DRENAGEM MÉTODO DRENESSE");
assert.equal(body.serv[0].tempo, 60);
assert.equal(body.serv[0].label, "22 - DRENAGEM MÉTODO DRENESSE");
assert.ok(!("tipoConsulta" in body));
assert.ok(!("tempo" in body));

const observation = buildObservation({
  name: "Maria",
  phone: "84999999999",
  unit: getUnit(1),
  objective: getObjective("corporal"),
  workRoutine: getWorkRoutine("sentado"),
  slot: payload.slot,
  tracking: { utm_source: "teste", utm_campaign: "metodo-drenesse" }
});
assert.match(observation, /Serviço: 22 - DRENAGEM MÉTODO DRENESSE/);
assert.match(observation, /Duração: 60 minutos/);
assert.match(observation, /Campanha: de R\$ 159,90 por R\$ 89,90/);
assert.match(observation, /Rotina: Trabalho sentado\(a\)/);

console.log("Booking payload tests passed.");
