import { isActive } from "./quoteCalculation.service";

export const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function getNextQuoteCode(quotes) {
  const nextNumber = Math.max(...quotes.map((quote) => Number(quote.code.split("-").pop()) || 0)) + 1;
  return `FK-2026-${String(nextNumber).padStart(3, "0")}`;
}

export function createNextQuoteVersion(quote, quotes, services) {
  const nextVersion = Math.max(...quotes.filter((item) => item.code === quote.code).map((item) => item.version)) + 1;
  const fallbackService = services.find((service) => isActive(service) && service.id !== quote.addons?.[0]?.serviceId);
  const addons = quote.addons?.length
    ? quote.addons.map((item, index) => (index === 0 ? { ...item, qty: Number(item.qty) + 1 } : item))
    : fallbackService
      ? [{ serviceId: fallbackService.id, qty: 1 }]
      : [];

  return {
    ...quote,
    id: `${quote.code}-v${nextVersion}-${Date.now().toString(36)}`,
    version: nextVersion,
    state: "Borrador",
    addons,
    observations: `${quote.observations} Ajuste simulado V${nextVersion}.`,
  };
}
