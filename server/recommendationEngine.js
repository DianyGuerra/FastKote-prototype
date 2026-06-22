export function normalizeRecommendationText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isActive = (item) => normalizeRecommendationText(item.estado) === "activo";

const eventMatches = (item, eventType) =>
  (item.tipoEvento || []).some((type) => {
    const normalizedType = normalizeRecommendationText(type);
    return eventType.includes(normalizedType) || normalizedType.includes(eventType);
  });

const findCatalogItem = (items, candidate) => {
  const id = normalizeRecommendationText(candidate?.id);
  const name = normalizeRecommendationText(candidate?.nombre || candidate?.name);
  return items.find((item) => {
    const itemId = normalizeRecommendationText(item.id);
    const itemName = normalizeRecommendationText(item.nombre || item.name);
    return (id && itemId === id) || (name && (itemName === name || itemName.includes(name) || name.includes(itemName)));
  });
};

const findService = (name, services) => findCatalogItem(services, { nombre: name });

function getCompatiblePromotion(promotions, eventType, eventDate, guestCount) {
  return (
    promotions.find((promotion) => {
      if (!isActive(promotion)) return false;
      if (!eventMatches(promotion, eventType)) return false;
      if (Number(promotion.minimoNinos || 0) > Number(guestCount || 0)) return false;
      if (!eventDate) return true;
      return eventDate >= promotion.fechaInicio && eventDate <= promotion.fechaFin;
    }) || null
  );
}

function getSuggestedServices({ eventType, theme, eventLocation, commercialConditions, clientPreferences }, services) {
  const combinedText = normalizeRecommendationText(`${eventType} ${theme} ${eventLocation} ${commercialConditions} ${clientPreferences}`);
  const suggestions = [];

  if (/(fotografia|foto|recuerdo|video|entretenimiento)/.test(combinedText)) {
    const service = findService("Photo Booth 360", services);
    if (service) suggestions.push(service);
  }

  if (eventType.includes("infantil") || eventType.includes("cumpleanos")) {
    ["Pinata personalizada", "Estacion de granizados", "Area de juegos"].forEach((name) => {
      const service = findService(name, services);
      if (service && !suggestions.some((item) => item.id === service.id)) suggestions.push(service);
    });
  }

  return suggestions;
}

function scorePackage(packageItem, { eventType, guestCount, budget, theme }) {
  const capacity = Number(packageItem.capacidadPersonas || 999);
  const price = Number(packageItem.precio || 0);
  const packageText = normalizeRecommendationText(
    `${packageItem.nombre} ${packageItem.categoria} ${packageItem.nivel} ${(packageItem.incluye || []).join(" ")}`,
  );
  let score = 0;

  if (!eventType || eventMatches(packageItem, eventType)) score += 45;
  else if (packageText.includes(eventType)) score += 18;

  if (guestCount > 0) {
    if (capacity >= guestCount) score += Math.max(12, 28 - Math.min(capacity - guestCount, 80) / 8);
    else score -= 30;
  }

  if (budget > 0 && price > 0) {
    const difference = Math.abs(price - budget);
    const tolerance = Math.max(budget * 0.35, 25);
    score += Math.max(0, 30 - (difference / tolerance) * 30);
    score += price <= budget ? 8 : -Math.min(15, ((price - budget) / Math.max(budget, 1)) * 15);
  } else {
    score += 10;
  }

  const normalizedTheme = normalizeRecommendationText(theme);
  if (normalizedTheme && packageText.includes(normalizedTheme)) score += 8;

  return score;
}

function selectBestPackage(packages, context) {
  if (!packages.length) return { packageItem: null, score: 0 };

  return packages
    .map((packageItem) => ({ packageItem, score: scorePackage(packageItem, context) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const budget = Number(context.budget || 0);
      if (!budget) return Number(a.packageItem.precio || 0) - Number(b.packageItem.precio || 0);
      return Math.abs(Number(a.packageItem.precio || 0) - budget) - Math.abs(Number(b.packageItem.precio || 0) - budget);
    })[0];
}

function getFitLevel(score) {
  if (score >= 78) return "alto";
  if (score >= 52) return "medio";
  return "bajo";
}

function buildFallbackJustification(packageItem, budget, score) {
  if (!packageItem) return "No se encontro un paquete compatible en el catalogo local.";

  const price = Number(packageItem.precio || 0);
  const budgetNote = budget > 0 && price > budget ? " El presupuesto estimado no alcanza para cubrir completamente esta opcion." : "";
  return `Fallback local: se evaluaron todos los paquetes activos del catalogo por tipo de evento, capacidad, presupuesto y tematica. Puntaje de ajuste: ${Math.round(score)}.${budgetNote}`;
}

function buildResponse({ packageItem, promotion, services, nivelAjuste, justificacion, necesitaMasDatos = false }) {
  const serviceTotal = services.reduce((total, service) => total + Number(service.precio || 0), 0);
  return {
    paqueteRecomendado: packageItem
      ? {
          id: packageItem.id,
          nombre: packageItem.nombre,
          precio: Number(packageItem.precio || 0),
        }
      : null,
    promocionAplicable: promotion,
    serviciosAdicionales: services,
    precioEstimado: Number(packageItem?.precio || 0) + serviceTotal,
    nivelAjuste,
    justificacion,
    necesitaMasDatos,
  };
}

export function recomendarPaquete(datosEvento, catalog) {
  const packages = (catalog.paquetes || []).filter(isActive);
  const services = (catalog.servicios || []).filter(isActive);
  const promotions = (catalog.promociones || []).filter(isActive);
  const eventType = normalizeRecommendationText(datosEvento.eventType);
  const guestCount = Number(datosEvento.guestCount || 0);
  const budget = Number(datosEvento.estimatedBudget || 0);
  const suggestedServices = getSuggestedServices({ ...datosEvento, eventType }, services);

  if (!eventType || guestCount <= 0) {
    return buildResponse({
      packageItem: null,
      promotion: null,
      services: suggestedServices,
      nivelAjuste: "bajo",
      justificacion: "Completa los datos del evento para generar una recomendacion mas precisa.",
      necesitaMasDatos: true,
    });
  }

  const promotion = getCompatiblePromotion(promotions, eventType, datosEvento.eventDate, guestCount);
  const { packageItem, score } = selectBestPackage(packages, {
    eventType,
    guestCount,
    budget,
    theme: datosEvento.theme,
  });
  const nivelAjuste = getFitLevel(score);
  const justificacion = buildFallbackJustification(packageItem, budget, score);

  return buildResponse({ packageItem, promotion, services: suggestedServices, nivelAjuste, justificacion });
}

export function parseJsonResponse(content) {
  const text = String(content || "").trim();
  if (!text) throw new Error("Groq devolvio una respuesta vacia.");

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export function validateRecommendation(rawRecommendation, catalog) {
  if (!rawRecommendation || typeof rawRecommendation !== "object") return null;

  const requiredKeys = ["paqueteRecomendado", "promocionAplicable", "serviciosAdicionales", "precioEstimado", "nivelAjuste", "justificacion", "necesitaMasDatos"];
  if (!requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(rawRecommendation, key))) return null;

  const packages = (catalog.paquetes || []).filter(isActive);
  const services = (catalog.servicios || []).filter(isActive);
  const promotions = (catalog.promociones || []).filter(isActive);

  const packageItem = rawRecommendation.paqueteRecomendado ? findCatalogItem(packages, rawRecommendation.paqueteRecomendado) : null;
  if (rawRecommendation.paqueteRecomendado && !packageItem) return null;

  if (!Array.isArray(rawRecommendation.serviciosAdicionales)) return null;
  const serviceItems = rawRecommendation.serviciosAdicionales.map((service) => findCatalogItem(services, service));
  if (serviceItems.some((service) => !service)) return null;

  const promotion = rawRecommendation.promocionAplicable ? findCatalogItem(promotions, rawRecommendation.promocionAplicable) : null;
  if (rawRecommendation.promocionAplicable && !promotion) return null;

  const nivelAjuste = normalizeRecommendationText(rawRecommendation.nivelAjuste);
  if (!["alto", "medio", "bajo"].includes(nivelAjuste)) return null;

  const computedPrice = Number(packageItem?.precio || 0) + serviceItems.reduce((total, service) => total + Number(service.precio || 0), 0);
  const aiPrice = Number(rawRecommendation.precioEstimado);

  return {
    paqueteRecomendado: packageItem
      ? {
          id: packageItem.id,
          nombre: packageItem.nombre,
          precio: Number(packageItem.precio || 0),
        }
      : null,
    promocionAplicable: promotion,
    serviciosAdicionales: serviceItems,
    precioEstimado: Number.isFinite(aiPrice) ? aiPrice : computedPrice,
    nivelAjuste,
    justificacion: String(rawRecommendation.justificacion || "").trim() || "Recomendacion generada con el catalogo FastKote.",
    necesitaMasDatos: Boolean(rawRecommendation.necesitaMasDatos),
  };
}

export function withRecommendationOrigin(recommendation, origen) {
  return {
    ...recommendation,
    origen,
  };
}
