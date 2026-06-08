import { useMemo, useState } from "react";
import { quotesSeed } from "../models/quotes.model";
import { buildCalendarEntries } from "../services/calendar.service";
import { simulatePdfGeneration } from "../services/pdf.service";
import { getById, getQuoteBreakdown } from "../services/quoteCalculation.service";
import { createNextQuoteVersion, getNextQuoteCode } from "../services/versioning.service";
import { simulateWhatsappSend } from "../services/whatsapp.service";

export function useQuotesController({ clients, packages, services, supplies, promotions, setNotice }) {
  const [quotes, setQuotes] = useState(quotesSeed);

  const quoteViews = useMemo(() => {
    const maxVersionByCode = quotes.reduce((acc, quote) => {
      acc[quote.code] = Math.max(acc[quote.code] || 0, quote.version);
      return acc;
    }, {});

    return [...quotes]
      .sort((a, b) => b.code.localeCompare(a.code) || b.version - a.version)
      .map((quote) => {
        const client = getById(clients, quote.clientId);
        const packageItem = getById(packages, quote.packageId);
        return {
          ...quote,
          clientName: client?.name || "Cliente no disponible",
          packageName: packageItem?.name || "Paquete no disponible",
          breakdown: getQuoteBreakdown(quote, packages, services, supplies, promotions),
          isLatest: maxVersionByCode[quote.code] === quote.version,
        };
      });
  }, [quotes, clients, packages, services, supplies, promotions]);

  const calendarEntries = useMemo(() => buildCalendarEntries(quoteViews), [quoteViews]);

  const createQuote = (quoteData) => {
    const code = getNextQuoteCode(quotes);
    setQuotes((current) => [
      {
        id: `${code}-v1-${Date.now().toString(36)}`,
        code,
        version: 1,
        state: "Borrador",
        ...quoteData,
      },
      ...current,
    ]);
    setNotice(`Cotizacion ${code} creada en estado Borrador. Cumple RN-01 y queda lista para PDF/WhatsApp simulado.`);
  };

  const editQuoteVersion = (quoteId) => {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    const nextQuote = createNextQuoteVersion(quote, quotes, services);
    setQuotes((current) => [nextQuote, ...current]);
    setNotice(`Se creo ${quote.code} V${nextQuote.version}. La version anterior permanece visible como historial.`);
  };

  const generatePdf = (quoteId) => {
    const quote = quoteViews.find((item) => item.id === quoteId);
    if (quote) setNotice(simulatePdfGeneration(quote));
  };

  const sendWhatsapp = (quoteId) => {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    setQuotes((current) =>
      current.map((item) => (item.id === quoteId && item.state === "Borrador" ? { ...item, state: "Enviada" } : item)),
    );
    setNotice(simulateWhatsappSend(quote));
  };

  const updateQuoteStatus = (quoteId, state) => {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    if (quote.state !== "Enviada") {
      setNotice(`RN-02 bloquea el cambio: ${quote.code} V${quote.version} no esta en estado Enviada.`);
      return;
    }
    setQuotes((current) => current.map((item) => (item.id === quoteId ? { ...item, state } : item)));
    setNotice(state === "Aceptada" ? `${quote.code} V${quote.version} ahora bloquea la fecha ${quote.eventDate}.` : `${quote.code} V${quote.version} queda ${state}; la fecha ${quote.eventDate} queda libre.`);
  };

  return {
    quotes,
    quoteViews,
    calendarEntries,
    createQuote,
    editQuoteVersion,
    generatePdf,
    sendWhatsapp,
    updateQuoteStatus,
  };
}
