export function simulatePdfGeneration(quote) {
  return `PDF simulado generado para ${quote.code} V${quote.version}. No se crea archivo real en esta demo.`;
}

export function createPdfMetadata(quote) {
  const pdfGeneratedAt = new Date().toISOString();
  return {
    pdfGenerated: true,
    pdfGeneratedAt,
    pdfFileName: `${quote.code}-V${quote.version}.pdf`,
  };
}
