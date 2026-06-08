import { currency } from "../../services/quoteCalculation.service";
import { AppIcon } from "../ui/AppIcon";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";

export function QuoteDetailModal({ quoteView, onClose }) {
  return (
    <Modal maxWidth="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">CU-SGC-L1-14 / CU-SGC-L1-18</p>
          <h3 className="text-2xl font-black text-slate-950">{quoteView.code} · V{quoteView.version}</h3>
          <p className="text-sm text-slate-500">Consulta visual de cotizacion y detalle consolidado para PDF simulado.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-slate-100"><AppIcon name="close" className="h-6 w-6" /></button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card className="shadow-none"><p className="text-xs uppercase text-slate-500">Cliente</p><p className="mt-1 font-bold">{quoteView.clientName}</p><p className="text-sm text-slate-500">{quoteView.eventDate} · {quoteView.time}</p></Card>
        <Card className="shadow-none"><p className="text-xs uppercase text-slate-500">Estado</p><div className="mt-1"><Badge variant={quoteView.state}>{quoteView.state}</Badge></div><p className="mt-2 text-sm text-slate-500">{quoteView.isLatest ? "Version vigente" : "Version historica visible"}</p></Card>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <h4 className="font-bold text-slate-950">{quoteView.packageName}</h4>
        <p className="mt-1 text-sm text-slate-500">{quoteView.observations}</p>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between"><span>Paquete base</span><strong>{currency(quoteView.breakdown.base)}</strong></div>
          <div className="flex justify-between"><span>Servicios adicionales</span><strong>{currency(quoteView.breakdown.addons)}</strong></div>
          <div className="flex justify-between"><span>Descuento activo</span><strong className="text-emerald-700">-{currency(quoteView.breakdown.discount)}</strong></div>
          <div className="flex justify-between"><span>IVA estimado</span><strong>{currency(quoteView.breakdown.tax)}</strong></div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-black">Total</span><strong>{currency(quoteView.breakdown.total)}</strong></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}
