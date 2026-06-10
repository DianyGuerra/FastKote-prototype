import { useMemo, useState } from "react";
import { quotesSeed } from "../models/quotes.model";
import { buildCalendarEntries, hasAcceptedTimeConflict } from "../services/calendar.service";
import { createPdfMetadata, simulatePdfGeneration } from "../services/pdf.service";
import { buildCalculationSnapshot, getById, getQuoteBreakdown, isPersonalizedQuote } from "../services/quoteCalculation.service";
import { createNextQuoteVersion, getNextQuoteCode } from "../services/versioning.service";
import { hasValidPhone, simulateWhatsappSend } from "../services/whatsapp.service";

export function useQuotesController({ clients, packages, services, supplies, promotions, setNotice }) {
  const [quotes, setQuotes] = useState(() =>
    quotesSeed.map((quote) => ({
      ...quote,
      startTime: quote.startTime || quote.time || "16:00",
      endTime: quote.endTime || "18:00",
      isPersonalized: quote.isPersonalized ?? isPersonalizedQuote(quote.addons),
      quoteType: quote.quoteType || (isPersonalizedQuote(quote.addons) ? "Personalizada" : "Base"),
      pdfGenerated: quote.pdfGenerated ?? false,
      pdfGeneratedAt: quote.pdfGeneratedAt || "",
      pdfFileName: quote.pdfFileName || "",
      calculationSnapshot: quote.calculationSnapshot || buildCalculationSnapshot(quote, packages, services, supplies, promotions),
    })),
  );

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

  const buildQuoteData = (quoteData) => {
    const calculationSnapshot = buildCalculationSnapshot(quoteData, packages, services, supplies, promotions);
    const isPersonalized = isPersonalizedQuote(quoteData.addons);
    return {
      ...quoteData,
      isPersonalized,
      quoteType: isPersonalized ? "Personalizada" : "Base",
      pdfGenerated: false,
      pdfGeneratedAt: "",
      pdfFileName: "",
      calculationSnapshot,
    };
  };

  const createQuote = (quoteData) => {
    if (hasAcceptedTimeConflict(quoteData, quoteViews)) {
      setNotice("Conflicto de agenda: horario no disponible");
      return false;
    }
    const code = getNextQuoteCode(quotes);
    const normalizedQuoteData = buildQuoteData(quoteData);
    setQuotes((current) => [
      {
        id: `${code}-v1-${Date.now().toString(36)}`,
        code,
        version: 1,
        state: "Borrador",
        ...normalizedQuoteData,
      },
      ...current,
    ]);
    setNotice(`Cotizacion ${code} creada en estado Borrador. Cumple RN-01 y queda lista para PDF/WhatsApp simulado.`);
    return true;
  };

  const startEditQuote = (quoteId) => {
    const quote = quoteViews.find((item) => item.id === quoteId);
    if (!quote?.isLatest || !["Borrador", "Enviada"].includes(quote.state)) {
      setNotice("La cotizacion no puede ser modificada en su estado actual");
      return null;
    }
    return quote;
  };

  const saveQuoteVersion = (quoteId, quoteData) => {
    const quote = quotes.find((item) => item.id === quoteId);
    const quoteView = quoteViews.find((item) => item.id === quoteId);
    if (!quote || !quoteView?.isLatest || !["Borrador", "Enviada"].includes(quote.state)) {
      setNotice("La cotizacion no puede ser modificada en su estado actual");
      return false;
    }
    if (hasAcceptedTimeConflict(quoteData, quoteViews, quoteId)) {
      setNotice("Conflicto de agenda: horario no disponible");
      return false;
    }
    const normalizedQuoteData = buildQuoteData(quoteData);
    const nextQuote = createNextQuoteVersion(quote, quotes, normalizedQuoteData);
    setQuotes((current) => [nextQuote, ...current]);
    setNotice(`Se creo ${quote.code} V${nextQuote.version}. La version anterior permanece visible como historial.`);
    return true;
  };

  const generatePdf = (quoteId) => {
    const quote = quoteViews.find((item) => item.id === quoteId);
    if (!quote?.isLatest) return;
    const metadata = createPdfMetadata(quote);
    setQuotes((current) => current.map((item) => (item.id === quoteId ? { ...item, ...metadata } : item)));
    setNotice(simulatePdfGeneration({ ...quote, ...metadata }));
  };

  const sendWhatsapp = (quoteId) => {
    const quote = quotes.find((item) => item.id === quoteId);
    const quoteView = quoteViews.find((item) => item.id === quoteId);
    if (!quote) return;
    if (!quoteView?.isLatest) return;
    if (!quote.pdfGenerated) {
      setNotice("Primero se debe generar el PDF de la cotizacion");
      return;
    }
    const client = getById(clients, quote.clientId);
    if (!hasValidPhone(client)) {
      setNotice("El cliente no cuenta con un numero de contacto valido");
      return;
    }
    setQuotes((current) =>
      current.map((item) => (item.id === quoteId && item.state === "Borrador" ? { ...item, state: "Enviada" } : item)),
    );
    setNotice(simulateWhatsappSend(quote));
  };

  const updateQuoteStatus = (quoteId, state) => {
    const quote = quotes.find((item) => item.id === quoteId);
    const quoteView = quoteViews.find((item) => item.id === quoteId);
    if (!quote || !quoteView?.isLatest) return;
    if (quote.state !== "Enviada") {
      setNotice(`RN-02 bloquea el cambio: ${quote.code} V${quote.version} no esta en estado Enviada.`);
      return;
    }
    if (state === "Aceptada" && hasAcceptedTimeConflict(quote, quoteViews, quoteId)) {
      setNotice("Conflicto: la fecha ya no se encuentra disponible");
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
    startEditQuote,
    saveQuoteVersion,
    generatePdf,
    sendWhatsapp,
    updateQuoteStatus,
  };
}
