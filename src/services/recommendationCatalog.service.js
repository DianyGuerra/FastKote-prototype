const text = (value) => String(value || "").trim();

export const recommendationSlugify = (value) =>
  text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const activeState = (value) => {
  const normalized = text(value || "activo").toLowerCase();
  return normalized === "inactivo" ? "inactivo" : "activo";
};

const numberValue = (...values) => {
  const value = values.map(Number).find((item) => Number.isFinite(item) && item > 0);
  return value || 0;
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = recommendationSlugify(item.nombre || item.name || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function normalizePackage(packageItem, index) {
  const nombre = text(packageItem.nombre || packageItem.name);
  const precio = numberValue(packageItem.precio, Number(packageItem.precioPorNino || 0) * Number(packageItem.minimoNinos || 0));
  const capacidadPersonas = numberValue(packageItem.capacidadPersonas, packageItem.capacidadMaxima, packageItem.minimoNinos, 999);

  return {
    id: packageItem.id || `PKG-${recommendationSlugify(nombre) || index}`,
    nombre,
    categoria: text(packageItem.categoria || "Catalogo FastKote"),
    precio,
    capacidadPersonas,
    tipoEvento: Array.isArray(packageItem.tipoEvento) ? packageItem.tipoEvento : [],
    incluye: Array.isArray(packageItem.incluye) ? packageItem.incluye : [],
    nivel: text(packageItem.nivel || "catalogo"),
    estado: activeState(packageItem.estado),
  };
}

function normalizeService(service, index, type = "Servicio") {
  const nombre = text(service.nombre || service.name);
  const precio = numberValue(service.precio, service.price);

  return {
    id: service.id || `SER-${recommendationSlugify(nombre) || index}`,
    nombre,
    categoria: text(service.categoria || type),
    precio: precio || null,
    requiereCotizacion: service.requiereCotizacion ?? !precio,
    tipoEvento: Array.isArray(service.tipoEvento) ? service.tipoEvento : [],
    estado: activeState(service.estado),
  };
}

function normalizePromotion(promotion, index) {
  const tipoEvento = [
    ...(Array.isArray(promotion.tipoEvento) ? promotion.tipoEvento : []),
    ...(Array.isArray(promotion.aplicaA) ? promotion.aplicaA : []),
    promotion.nombre,
    promotion.condicion,
  ].filter(Boolean);

  return {
    id: promotion.id || `PROM-${recommendationSlugify(promotion.nombre || promotion.name) || index}`,
    nombre: text(promotion.nombre || promotion.name),
    tipoEvento,
    precioPorNino: Number(promotion.precioPorNino || 0),
    minimoNinos: Number(promotion.minimoNinos || 0),
    fechaInicio: promotion.fechaInicio || "1900-01-01",
    fechaFin: promotion.fechaFin || "2999-12-31",
    incluye: Array.isArray(promotion.incluye) ? promotion.incluye : [],
    descuento: promotion.descuento || null,
    condicion: promotion.condicion || "",
    estado: activeState(promotion.estado),
  };
}

export function buildRecommendationCatalog(localCatalog = {}, rootCatalog = {}) {
  const rootServices = [
    ...(rootCatalog.productos || []).map((item, index) => normalizeService(item, `PROD-${index}`, "Producto")),
    ...(rootCatalog.servicios || []).map((item, index) => normalizeService(item, index)),
  ];

  return {
    paquetes: uniqueById([...(rootCatalog.paquetes || []).map(normalizePackage), ...(localCatalog.paquetes || [])]),
    servicios: uniqueById([...rootServices, ...(localCatalog.servicios || [])]),
    promociones: uniqueById([...(rootCatalog.promociones || []).map(normalizePromotion), ...(localCatalog.promociones || [])]),
  };
}
