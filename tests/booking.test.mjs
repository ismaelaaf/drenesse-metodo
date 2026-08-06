import assert from "node:assert/strict";
import {
  BENEFIT_USED_WHATSAPP_MESSAGE,
  buildBenefitUsedWhatsapp,
  buildObservation
} from "../api/_belle.js";
import { BOOKING_ENDPOINT, buildBookingBody, findExistingClientByPhone } from "../api/submit-booking.js";
import { PROMOTION, SELLER, getObjective, getUnit, getWorkRoutine } from "../src/lib/domain.js";

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
assert.equal(body.codVendedor, SELLER.code);
assert.equal(body.codVendedor, "99915");
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
assert.match(observation, /Vendedor: Ismael Anderson de Araújo Figueiredo/);

const searchedUnits = [];
const searchedPhones = [];
const existingClient = await findExistingClientByPhone("+55 (84) 9 8830-7853", 2, async (_path, { query }) => {
  searchedUnits.push(query.codEstab);
  searchedPhones.push(query.celular);
  assert.equal(query.cpf, "");
  return query.codEstab === 3 ? { codigo: 9876 } : [];
});
assert.deepEqual(searchedUnits, [2, 1, 3]);
assert.deepEqual(searchedPhones, ["84988307853", "84988307853", "84988307853"]);
assert.deepEqual(existingClient, { clientCode: "9876", unitCode: 3 });

const benefitUsedUrl = buildBenefitUsedWhatsapp();
assert.equal(new URL(benefitUsedUrl).searchParams.get("text"), BENEFIT_USED_WHATSAPP_MESSAGE);
assert.equal(BENEFIT_USED_WHATSAPP_MESSAGE, "Olá, gostaria de obter mais informações sobre Método Drenesse.");

console.log("Booking payload tests passed.");
