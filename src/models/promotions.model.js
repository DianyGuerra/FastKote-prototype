export const promotionsSeed = [
  { id: "temporada-escolar", name: "Temporada Escolar", discountPercent: 10, range: "2026-05-20 al 2026-06-30", condition: "Aplica a Cierre de Curso", packageIds: ["cierre-curso"], state: "Activo" },
  { id: "dia-nino", name: "Dia del Nino", discountPercent: 15, range: "2026-05-25 al 2026-06-15", condition: "Solo paquetes infantiles", packageIds: ["infantil-basico"], state: "Activo" },
  { id: "navidad-2025", name: "Navidad 2025", discountPercent: 12, range: "2025-12-01 al 2025-12-24", condition: "Promocion de temporada cerrada", packageIds: ["mesa-dulce-express"], state: "Inactivo" },
];
