import { TAX_RATE } from "../models/businessRules.model";

export const currency = (value) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value) || 0);

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const getById = (items, id) => items.find((item) => item.id === id);

export const isActive = (item) => item?.state === "Activo";

export function computeServiceCost(service, supplies) {
  return roundMoney(
    (service.recipe || []).reduce((total, item) => {
      const supply = getById(supplies, item.supplyId);
      if (!isActive(supply)) return total;
      return total + supply.cost * Number(item.qty || 0);
    }, 0),
  );
}

export function computePackageCost(packageItem, services, supplies) {
  return roundMoney(
    (packageItem.items || []).reduce((total, item) => {
      const service = getById(services, item.serviceId);
      if (!isActive(service)) return total;
      return total + computeServiceCost(service, supplies) * Number(item.qty || 0);
    }, 0),
  );
}

export function computePackagePrice(packageItem, services, supplies) {
  const cost = computePackageCost(packageItem, services, supplies);
  return roundMoney(cost * (1 + Number(packageItem.margin || 0) / 100));
}

export function getActivePromotion(promotions, packageId) {
  return promotions.find((promotion) => isActive(promotion) && promotion.packageIds.includes(packageId));
}

export function getQuoteBreakdown(quote, packages, services, supplies, promotions) {
  const packageItem = getById(packages, quote.packageId);
  const packageIsUsable = isActive(packageItem);
  const base = packageIsUsable ? computePackagePrice(packageItem, services, supplies) : 0;
  const addons = (quote.addons || []).reduce((total, item) => {
    const service = getById(services, item.serviceId);
    if (!isActive(service)) return total;
    return total + service.price * Number(item.qty || 0);
  }, 0);
  const subtotal = roundMoney(base + addons);
  const promotion = packageIsUsable ? getActivePromotion(promotions, quote.packageId) : null;
  const discount = promotion ? roundMoney((subtotal * promotion.discountPercent) / 100) : 0;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = roundMoney(taxable * TAX_RATE);

  return {
    base,
    addons: roundMoney(addons),
    subtotal,
    promotion,
    discount,
    tax,
    total: roundMoney(taxable + tax),
  };
}

export function getServiceProfitRisk(cost, price) {
  if (cost >= Number(price || 0)) return "Critico";
  if (cost >= Number(price || 0) * 0.85) return "Margen bajo";
  return "Rentable";
}
