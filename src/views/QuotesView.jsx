import { useState } from "react";
import { QuoteDetailModal } from "../components/modals/QuoteDetailModal";
import { QuoteModal } from "../components/modals/QuoteModal";
import { StatusModal } from "../components/modals/StatusModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { SearchBar } from "../components/ui/SearchBar";
import { SectionHeader } from "../components/ui/SectionHeader";
import { currency } from "../services/quoteCalculation.service";

export function QuotesView({ clients, packages, packageMetrics, services, promotions, quoteViews, onCreateQuote, onEditVersion, onGeneratePdf, onSendWhatsapp, onUpdateStatus }) {
  const [showQuote, setShowQuote] = useState(false);
  const [statusQuote, setStatusQuote] = useState(null);
  const [detailQuote, setDetailQuote] = useState(null);
  const total = quoteViews.reduce((acc, quote) => acc + quote.breakdown.total, 0);

  return (
    <div>
      <SectionHeader
        eyebrow="RF-02 · CU-SGC-L0-03"
        title="Administrar cotizaciones"
        description="Crear, consultar, editar/versionar, generar PDF, enviar por WhatsApp y actualizar estado respetando RN-01, RN-02 y RN-03."
        action={<Button icon="plus" onClick={() => setShowQuote(true)}>Generar cotizacion</Button>}
      />
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Cliente o codigo
            <SearchBar placeholder="Ej. Maria o FK-2026-014" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Estado
            <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 [color-scheme:light]">
              <option>Todos los estados</option>
              <option>Borrador</option>
              <option>Enviada</option>
              <option>Aceptada</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Fecha desde
            <input type="date" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 [color-scheme:light]" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Fecha hasta
            <input type="date" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 [color-scheme:light]" />
          </label>
          <Button variant="secondary" icon="search" className="self-end">Buscar</Button>
        </div>
      </Card>
      <DataTable
        headers={["Codigo", "Cliente", "Paquete", "Fecha/hora", "Version", "Estado", "Total", "Acciones"]}
        rows={quoteViews.map((quote) => [
          <div>
            <p>{quote.code}</p>
            {!quote.isLatest && <div className="mt-1"><Badge variant="Historial">Historial</Badge></div>}
          </div>,
          quote.clientName,
          quote.packageName,
          <div><p>{quote.eventDate}</p><p className="text-xs text-slate-500">{quote.time}</p></div>,
          `V${quote.version}`,
          <Badge variant={quote.state}>{quote.state}</Badge>,
          currency(quote.breakdown.total),
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon="eye" onClick={() => setDetailQuote(quote)}>Ver</Button>
            <Button variant="ghost" icon="edit" onClick={() => onEditVersion(quote.id)}>Editar</Button>
            <Button variant="ghost" icon="settings" onClick={() => setStatusQuote(quote)}>Estado</Button>
            <Button variant="ghost" icon="download" onClick={() => onGeneratePdf(quote.id)}>PDF</Button>
            <Button variant="whatsapp" icon="whatsapp" onClick={() => onSendWhatsapp(quote.id)}>WhatsApp</Button>
          </div>,
        ])}
      />
      <div className="mt-4 flex justify-end text-sm text-slate-600">Monto total mostrado: <strong className="ml-2 text-slate-950">{currency(total)}</strong></div>
      {showQuote && (
        <QuoteModal
          clients={clients}
          packages={packages}
          packageMetrics={packageMetrics}
          services={services}
          promotions={promotions}
          onClose={() => setShowQuote(false)}
          onSave={(quote) => {
            onCreateQuote(quote);
            setShowQuote(false);
          }}
        />
      )}
      {statusQuote && (
        <StatusModal
          quoteView={statusQuote}
          onClose={() => setStatusQuote(null)}
          onUpdate={(id, state) => {
            onUpdateStatus(id, state);
            setStatusQuote(null);
          }}
        />
      )}
      {detailQuote && <QuoteDetailModal quoteView={detailQuote} onClose={() => setDetailQuote(null)} />}
    </div>
  );
}
