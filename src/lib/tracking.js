import { normalizeBrazilianMobile } from "./domain.js";

export function splitFullName(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

export function buildLeadTypebotEvent({ name, email, phone }) {
  const normalizedName = String(name).trim().replace(/\s+/g, " ");
  const normalizedPhone = normalizeBrazilianMobile(phone);
  const { firstName, lastName } = splitFullName(normalizedName);

  return {
    event: "lead-typebot",
    name: normalizedName,
    first_name: firstName,
    last_name: lastName,
    email: String(email).trim().toLowerCase(),
    phone: normalizedPhone ? `+55${normalizedPhone}` : ""
  };
}

export function pushLeadTypebotEvent(user, target = window) {
  target.dataLayer = target.dataLayer || [];
  const event = buildLeadTypebotEvent(user);
  target.dataLayer.push(event);
  return event;
}
