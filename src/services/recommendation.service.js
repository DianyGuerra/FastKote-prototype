import catalogoFastKote from "../data/catalogoFastKote.json";

export const GROQ_RECOMMENDATION_PROMPT = `Eres un asistente inteligente de recomendación para FastKote, sistema de cotizaciones del negocio "Chichi Está de Fiesta".

Tu función es analizar los datos del evento ingresados por el administrador y recomendar paquetes, productos, servicios adicionales y promociones que ayuden a construir una cotización adecuada para el cliente.

Utiliza únicamente la información disponible en la base de conocimiento del negocio. No inventes paquetes, productos, servicios, promociones ni precios que no existan en el catálogo.

Debes considerar los siguientes datos cuando estén disponibles:

* Tipo de evento.
* Número de invitados.
* Presupuesto estimado.
* Fecha del evento.
* Hora de inicio y fin.
* Lugar del evento.
* Temática o necesidad visual.
* Requiere factura/IVA.
* Observaciones comerciales.

Reglas de recomendación:

1. Analiza la compatibilidad entre el tipo de evento y los paquetes disponibles.
2. Verifica si el presupuesto estimado es suficiente para la recomendación.
3. Prioriza los paquetes que mejor se adapten al número de invitados.
4. Sugiere productos o servicios complementarios que aporten valor al evento.
5. Identifica promociones aplicables según la fecha o el tipo de evento.
6. Si no existe una coincidencia exacta, recomienda la alternativa más cercana y explica brevemente el motivo.
7. Si el presupuesto es insuficiente, indícalo claramente y propone una opción más económica.
8. Nunca generes información fuera del catálogo.

Formato de salida:

Paquete recomendado:
[Nombre del paquete]

Promoción aplicable:
[Nombre de la promoción o "No aplica"]

Servicios o productos sugeridos:

* Elemento 1
* Elemento 2
* Elemento 3

Justificación:
[Breve explicación de por qué la recomendación es adecuada para el evento]

Nivel de confianza:
[Alto / Medio / Bajo]

Acción sugerida:
[Aplicar recomendación / Revisar presupuesto / Solicitar más información]`;

export function buildGroqRecommendationMessages(datosEvento, catalog = catalogoFastKote) {
  return [
    {
      role: "system",
      content: GROQ_RECOMMENDATION_PROMPT,
    },
    {
      role: "user",
      content: [
        "Datos del evento ingresados por el administrador:",
        JSON.stringify(datosEvento, null, 2),
        "",
        "Base de conocimiento del negocio:",
        JSON.stringify(catalog, null, 2),
      ].join("\n"),
    },
  ];
}

export function normalizeRecommendationText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
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

const findPackage = (name, packages) =>
  packages.find((packageItem) => normalizeRecommendationText(packageItem.nombre) === normalizeRecommendationText(name));

const findService = (name, services) =>
  services.find((service) => normalizeRecommendationText(service.nombre) === normalizeRecommendationText(name));

function getCompatiblePromotion(promotions, eventType, eventDate, guestCount) {
  return promotions.find((promotion) => {
    if (!isActive(promotion)) return false;
    if (!eventMatches(promotion, eventType)) return false;
    if (Number(promotion.minimoNinos || 0) > Number(guestCount || 0)) return false;
    if (!eventDate) return true;
    return eventDate >= promotion.fechaInicio && eventDate <= promotion.fechaFin;
  }) || null;
}

function getSuggestedServices({ eventType, theme, eventLocation, commercialConditions }, services) {
  const combinedText = normalizeRecommendationText(`${eventType} ${theme} ${eventLocation} ${commercialConditions}`);
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

function nearestPackage(packages, guestCount, budget, eventType) {
  const compatible = packages.filter((packageItem) => {
    const capacity = Number(packageItem.capacidadPersonas || 999);
    return capacity >= Number(guestCount || 0) && (!eventType || eventMatches(packageItem, eventType));
  });
  const source = compatible.length ? compatible : packages;

  if (!source.length) return null;
  if (!budget) return source[0];

  return [...source].sort((a, b) => Math.abs(Number(a.precio || 0) - budget) - Math.abs(Number(b.precio || 0) - budget))[0];
}

function buildResponse({ packageItem, promotion, services, nivelAjuste, justificacion }) {
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
    necesitaMasDatos: false,
  };
}

export function recomendarPaquete(datosEvento, catalog = catalogoFastKote) {
  const packages = (catalog.paquetes || []).filter(isActive);
  const services = (catalog.servicios || []).filter(isActive);
  const promotions = (catalog.promociones || []).filter(isActive);
  const eventType = normalizeRecommendationText(datosEvento.eventType);
  const guestCount = Number(datosEvento.guestCount || 0);
  const budget = Number(datosEvento.estimatedBudget || 0);
  const suggestedServices = getSuggestedServices({ ...datosEvento, eventType }, services);

  if (!eventType || guestCount <= 0) {
    return {
      paqueteRecomendado: null,
      promocionAplicable: null,
      serviciosAdicionales: suggestedServices,
      precioEstimado: 0,
      nivelAjuste: "bajo",
      justificacion: "Completa los datos del evento para generar una recomendacion mas precisa.",
      necesitaMasDatos: true,
    };
  }

  const promotion = getCompatiblePromotion(promotions, eventType, datosEvento.eventDate, guestCount);
  let packageItem = null;
  let nivelAjuste = "medio";
  let justificacion = "";

  if (eventType.includes("cumpleanos infantil") && guestCount <= 30 && budget >= 85 && budget <= 110) {
    packageItem = findPackage("Combo Super Fiesta", packages);
    nivelAjuste = "alto";
    justificacion = "Evento infantil pequeno con presupuesto cercano a 100 dolares; Combo Super Fiesta cubre el rango y tematica.";
  } else if ((eventType.includes("cumpleanos infantil") || eventType.includes("evento escolar")) && guestCount <= 50 && budget > 0 && budget <= 75) {
    packageItem = findPackage("Combo Bronce", packages);
    nivelAjuste = "alto";
    justificacion = "Presupuesto ajustado y hasta 50 invitados; Combo Bronce es la opcion economica compatible.";
  } else if (guestCount <= 50 && budget >= 90 && budget <= 110) {
    packageItem = findPackage("Combo Plata", packages);
    nivelAjuste = "alto";
    justificacion = "Presupuesto intermedio entre 90 y 110 dolares; Combo Plata es el ajuste mas cercano.";
  } else if (guestCount <= 50 && budget >= 120) {
    packageItem = findPackage("Combo Oro", packages);
    nivelAjuste = "alto";
    justificacion = "Presupuesto premium para hasta 50 invitados; Combo Oro ofrece mayor cobertura de snacks.";
  }

  if (!packageItem) {
    packageItem = nearestPackage(packages, guestCount, budget, eventType);
    const difference = Math.abs(Number(packageItem?.precio || 0) - budget);
    nivelAjuste = budget && difference <= 25 ? "medio" : "bajo";
    justificacion = packageItem
      ? "No hay una regla exacta; se recomienda el paquete mas cercano al tipo de evento, capacidad y presupuesto."
      : "No se encontro un paquete compatible en el catalogo local.";
  }

  // Punto de extension: esta funcion puede reemplazarse por una llamada a Groq, n8n
  // o una API propia manteniendo el mismo contrato de respuesta.
  return buildResponse({ packageItem, promotion, services: suggestedServices, nivelAjuste, justificacion });
}
