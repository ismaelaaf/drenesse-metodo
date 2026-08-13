import { normalizeBrazilianMobile } from "./domain.js";

export function buildLeadTypebotEvent({ name, phone }) {
  const normalizedName = String(name).trim().replace(/\s+/g, " ");
  const normalizedPhone = normalizeBrazilianMobile(phone);

  return {
    event: "lead-typebot",
    name: normalizedName,
    phone: normalizedPhone ? `+55${normalizedPhone}` : ""
  };
}

export function pushLeadTypebotEvent(user, target = window) {
  target.dataLayer = target.dataLayer || [];
  const event = buildLeadTypebotEvent(user);
  target.dataLayer.push(event);
  return event;
}
