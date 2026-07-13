import assert from "node:assert/strict";
import {
  AVAILABILITY_WINDOW_DAYS,
  buildAvailabilityQuery,
  buildAvailabilityDates,
  queryAvailabilityWindow
} from "../api/availability.js";

assert.equal(AVAILABILITY_WINDOW_DAYS, 6);
assert.deepEqual(buildAvailabilityQuery(3, "10/07/2026"), {
  codEstab: 3,
  dtAgenda: "10/07/2026",
  periodo: "todos",
  servicos: "22",
  tpAgd: "p"
});
assert.deepEqual(buildAvailabilityDates("30/12/2026"), [
  "30/12/2026",
  "31/12/2026",
  "01/01/2027",
  "02/01/2027",
  "03/01/2027",
  "04/01/2027"
]);

function rawDay(date, time = "09:00") {
  return {
    nome: "Dia disponível",
    data: date,
    disp: "Livre",
    horarios: [
      {
        codProf: 42,
        nome: "Profissional Teste",
        horarios: [{ horario: time, bloq: "l", turno: "M" }]
      }
    ]
  };
}

const requestedDates = [];
let activeRequests = 0;
let maximumConcurrency = 0;
const partial = await queryAvailabilityWindow({
  startDate: "30/12/2026",
  concurrency: 3,
  fetchDate: async (date) => {
    requestedDates.push(date);
    activeRequests += 1;
    maximumConcurrency = Math.max(maximumConcurrency, activeRequests);
    await new Promise((resolve) => setTimeout(resolve, 4));
    activeRequests -= 1;

    if (date === "31/12/2026") {
      const rateLimit = new Error("Rate limit");
      rateLimit.statusCode = 429;
      throw rateLimit;
    }
    if (date === "02/01/2027") throw new Error("Temporary failure");
    if (date === "30/12/2026") return [rawDay(date), rawDay(date)];
    return [];
  }
});

assert.deepEqual(requestedDates.sort(), buildAvailabilityDates("30/12/2026").sort());
assert.ok(maximumConcurrency <= 3);
assert.equal(partial.partial, true);
assert.equal(partial.successfulDates, 4);
assert.deepEqual(partial.failedDates, ["31/12/2026", "02/01/2027"]);
assert.equal(partial.startDate, "30/12/2026");
assert.equal(partial.endDate, "04/01/2027");
assert.equal(partial.days.length, 1);
assert.equal(partial.days[0].slots.length, 1);

const empty = await queryAvailabilityWindow({
  startDate: "09/07/2026",
  fetchDate: async () => []
});
assert.equal(empty.partial, false);
assert.equal(empty.successfulDates, 6);
assert.deepEqual(empty.days, []);

const failed = await queryAvailabilityWindow({
  startDate: "09/07/2026",
  fetchDate: async () => {
    throw new Error("Offline");
  }
});
assert.equal(failed.successfulDates, 0);
assert.equal(failed.failedDates.length, 6);

console.log("Availability tests passed.");
