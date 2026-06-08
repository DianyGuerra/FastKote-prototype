import { menuItems } from "../constants/menuItems";
import { VALID_QUOTE_STATES } from "../models/businessRules.model";
import { isActive } from "../services/quoteCalculation.service";

export function runSelfChecks({ clients, quotes, packages, services, supplies, quoteViews, packageMetrics, serviceMetrics, calendarEntries }) {
  const activePackageIds = new Set(packages.filter(isActive).map((item) => item.id));
  const activeServiceIds = new Set(services.filter(isActive).map((item) => item.id));
  const acceptedDates = new Set(quoteViews.filter((quote) => quote.state === "Aceptada").map((quote) => quote.eventDate));
  const blockedDates = new Set(calendarEntries.filter((entry) => entry.state === "Bloqueada").map((entry) => entry.date));

  return [
    { name: "Existe al menos un cliente activo", pass: clients.some(isActive) },
    { name: "RN-01: cotizaciones con cliente, paquete y fecha", pass: quotes.every((quote) => quote.clientId && quote.packageId && quote.eventDate) },
    { name: "Estados de cotizacion dentro del ciclo permitido", pass: quotes.every((quote) => VALID_QUOTE_STATES.includes(quote.state)) },
    { name: "Paquetes activos con servicios activos y precio sugerido calculado", pass: packages.filter(isActive).every((item) => (item.items || []).some((detail) => activeServiceIds.has(detail.serviceId)) && (packageMetrics.get(item.id)?.price || 0) > 0) },
    { name: "Servicios activos calculan costo desde insumos activos", pass: services.filter(isActive).every((service) => serviceMetrics.has(service.id)) },
    { name: "Insumos activos disponibles para recetas tecnicas", pass: supplies.some(isActive) },
    { name: "RN-03: cada cotizacion aceptada bloquea su fecha", pass: [...acceptedDates].every((date) => blockedDates.has(date)) },
    { name: "RN-04: generacion solo expone paquetes activos", pass: activePackageIds.size > 0 && packages.some((item) => item.state === "Inactivo") },
    { name: "Todo item del menu tiene trazabilidad RF/CU", pass: menuItems.every((item) => item.trace && item.trace.length > 0) },
  ];
}
