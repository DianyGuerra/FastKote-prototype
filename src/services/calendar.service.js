export function buildCalendarEntries(quoteViews) {
  const dates = [...new Set([...quoteViews.map((quote) => quote.eventDate), "2026-06-12", "2026-06-26"])].sort();

  return dates.map((date) => {
    const accepted = quoteViews.filter((quote) => quote.eventDate === date && quote.state === "Aceptada");
    const tentative = quoteViews.filter((quote) => quote.eventDate === date && ["Borrador", "Enviada"].includes(quote.state));
    const closed = quoteViews.filter((quote) => quote.eventDate === date && ["Rechazada", "Vencida"].includes(quote.state));

    if (accepted.length) {
      return { date, state: "Bloqueada", summary: accepted.map((quote) => `${quote.code} V${quote.version}`).join(", "), client: accepted[0].clientName };
    }

    if (tentative.length) {
      return { date, state: "Tentativa", summary: tentative.map((quote) => `${quote.code} V${quote.version}`).join(", "), client: "Pendiente de aceptacion" };
    }

    if (closed.length) {
      return { date, state: "Libre", summary: "Cotizacion cerrada sin bloqueo", client: closed[0].clientName };
    }

    return { date, state: "Libre", summary: "Sin evento aceptado", client: "Disponible" };
  });
}
