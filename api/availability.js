import { allowMethods, belleFetch, flattenAvailability, getQuery, normalizeDateParam, sendJson } from "./_belle.js";
import { getUnit, PROMOTION } from "../src/lib/domain.js";

export const AVAILABILITY_WINDOW_DAYS = 6;
const AVAILABILITY_CONCURRENCY = 3;

export function buildAvailabilityQuery(unitCode, date) {
  return {
    codEstab: Number(unitCode),
    dtAgenda: date,
    periodo: "todos",
    servicos: String(PROMOTION.serviceCode),
    tpAgd: "p"
  };
}

function parseBelleDate(value) {
  const [day, month, year] = String(value || "").split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatBelleDate(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function buildAvailabilityDates(startDate, count = AVAILABILITY_WINDOW_DAYS) {
  const start = parseBelleDate(startDate);
  if (!start) return [];

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return formatBelleDate(date);
  });
}

async function settleWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;

      try {
        results[index] = { status: "fulfilled", value: await mapper(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function mergeAvailabilityDays(groups, requestedDates) {
  const allowedDates = new Set(requestedDates);
  const dateOrder = new Map(requestedDates.map((date, index) => [date, index]));
  const daysByDate = new Map();

  groups.flat().forEach((day) => {
    if (!day?.date || !allowedDates.has(day.date)) return;

    const current = daysByDate.get(day.date) || {
      name: day.name || "",
      date: day.date,
      availabilityText: day.availabilityText || "",
      slots: [],
      slotIds: new Set()
    };

    (day.slots || []).forEach((slot) => {
      const slotId = slot.id || `${day.date}-${slot.time}-${slot.professionalCode}`;
      if (current.slotIds.has(slotId)) return;
      current.slotIds.add(slotId);
      current.slots.push({ ...slot, id: slotId });
    });

    daysByDate.set(day.date, current);
  });

  return [...daysByDate.values()]
    .sort((left, right) => dateOrder.get(left.date) - dateOrder.get(right.date))
    .map(({ slotIds, ...day }) => ({
      ...day,
      slots: day.slots.sort((left, right) => {
        const timeComparison = String(left.time || "").localeCompare(String(right.time || ""));
        if (timeComparison) return timeComparison;
        return String(left.professionalName || "").localeCompare(String(right.professionalName || ""));
      })
    }));
}

export async function queryAvailabilityWindow({ startDate, fetchDate, concurrency = AVAILABILITY_CONCURRENCY }) {
  const dates = buildAvailabilityDates(startDate);
  const settled = await settleWithConcurrency(dates, concurrency, async (date) => {
    const rawAvailability = await fetchDate(date);
    return flattenAvailability(rawAvailability);
  });
  const successfulGroups = [];
  const failedDates = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") successfulGroups.push(result.value);
    else failedDates.push(dates[index]);
  });

  return {
    startDate: dates[0],
    endDate: dates.at(-1),
    days: mergeAvailabilityDays(successfulGroups, dates),
    failedDates,
    partial: failedDates.length > 0,
    successfulDates: dates.length - failedDates.length
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  const unitCode = Number(getQuery(req, "unit") || getQuery(req, "codEstab"));
  const unit = getUnit(unitCode);
  if (!unit) {
    sendJson(res, 400, { message: "Unidade inválida." });
    return;
  }

  const dtAgenda = normalizeDateParam(getQuery(req, "date") || getQuery(req, "dtAgenda"));

  try {
    const availability = await queryAvailabilityWindow({
      startDate: dtAgenda,
      fetchDate: (date) => belleFetch("/agenda/disponibilidade", {
        query: buildAvailabilityQuery(unit.code, date)
      })
    });

    if (!availability.successfulDates) {
      sendJson(res, 502, {
        message: "Não conseguimos consultar a agenda agora. Tente novamente em alguns instantes.",
        startDate: availability.startDate,
        endDate: availability.endDate,
        failedDates: availability.failedDates,
        partial: false
      });
      return;
    }

    sendJson(res, 200, {
      unit,
      service: PROMOTION,
      requestedDate: dtAgenda,
      startDate: availability.startDate,
      endDate: availability.endDate,
      days: availability.days,
      failedDates: availability.failedDates,
      partial: availability.partial
    });
  } catch (error) {
    sendJson(res, error.statusCode || 502, {
      message: "Não conseguimos consultar a agenda agora. Tente novamente em alguns instantes."
    });
  }
}
