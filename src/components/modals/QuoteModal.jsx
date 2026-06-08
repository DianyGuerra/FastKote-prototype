import { useState } from "react";
import { MIN_EVENT_DATE, TAX_RATE } from "../../models/businessRules.model";
import { currency, getActivePromotion, isActive, roundMoney } from "../../services/quoteCalculation.service";
import { AppIcon } from "../ui/AppIcon";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/SelectField";

export function QuoteModal({ clients, packages, packageMetrics, services, promotions, onClose, onSave }) {
  const activeClients = clients.filter(isActive);
  const activePackages = packages.filter(isActive);
  const activeServices = services.filter(isActive);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    clientId: activeClients[0]?.id || "",
    packageId: activePackages[0]?.id || "",
    eventDate: MIN_EVENT_DATE,
    time: "16:00",
    observations: "Observaciones del evento y personalizacion solicitada.",
  });
  const [addons, setAddons] = useState({});

  const packagePreview = packageMetrics.get(form.packageId);
  const addonTotal = activeServices.reduce((total, service) => total + Number(addons[service.id] || 0) * service.price, 0);
  const subtotal = roundMoney((packagePreview?.price || 0) + addonTotal);
  const promotion = getActivePromotion(promotions, form.packageId);
  const discount = promotion ? roundMoney((subtotal * promotion.discountPercent) / 100) : 0;
  const tax = roundMoney(Math.max(subtotal - discount, 0) * TAX_RATE);
  const total = roundMoney(subtotal - discount + tax);
  const errors = {
    clientId: form.clientId ? "" : "Selecciona un cliente.",
    packageId: form.packageId ? "" : "Selecciona un paquete activo.",
    eventDate: !form.eventDate ? "Selecciona una fecha." : form.eventDate < MIN_EVENT_DATE ? `La fecha minima es ${MIN_EVENT_DATE}.` : "",
  };
  const isValid = !errors.clientId && !errors.packageId && !errors.eventDate;

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateAddon = (serviceId, value) =>
    setAddons((current) => ({ ...current, [serviceId]: Math.max(0, Number(value) || 0) }));

  const save = () => {
    setSubmitted(true);
    if (!isValid) return;
    onSave({
      ...form,
      addons: Object.entries(addons)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([serviceId, qty]) => ({ serviceId, qty: Number(qty) })),
    });
  };

  return (
    <Modal>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">CU-SGC-L1-11 / L1-12 / RN-01</p>
          <h3 className="text-2xl font-black text-slate-950">Generar cotizacion</h3>
          <p className="text-sm text-slate-500">Formulario simulado con validacion minima, paquete activo y calculo visual.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-slate-100"><AppIcon name="close" className="h-6 w-6" /></button>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4">
          <SelectField label="Cliente *" value={form.clientId} onChange={(value) => updateForm("clientId", value)} error={submitted ? errors.clientId : ""}>
            {activeClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </SelectField>
          <SelectField label="Paquete base activo *" value={form.packageId} onChange={(value) => updateForm("packageId", value)} error={submitted ? errors.packageId : ""}>
            {activePackages.map((packageItem) => <option key={packageItem.id} value={packageItem.id}>{packageItem.name}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha del evento *" value={form.eventDate} onChange={(value) => updateForm("eventDate", value)} type="date" min={MIN_EVENT_DATE} error={submitted ? errors.eventDate : ""} />
            <Field label="Hora" value={form.time} onChange={(value) => updateForm("time", value)} type="time" />
          </div>
          <Field label="Observaciones" value={form.observations} onChange={(value) => updateForm("observations", value)} as="textarea" />
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
            Estado inicial: <strong>Borrador</strong>. La fecha queda tentativa y solo se bloquea si luego cambia a Aceptada.
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-950">Cotizacion personalizada</h4>
                <p className="text-sm text-slate-500">Servicios/productos activos agregados por cantidad.</p>
              </div>
              <Badge variant="Activo">Solo activos</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {activeServices.map((service) => (
                <label key={service.id} className="grid grid-cols-[1fr_86px] items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                  <span>
                    <strong className="block text-slate-800">{service.name}</strong>
                    <span className="text-xs text-slate-500">{currency(service.price)} por unidad</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={addons[service.id] || 0}
                    onChange={(event) => updateAddon(service.id, event.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex justify-between text-sm"><span>Paquete base sugerido</span><strong>{currency(packagePreview?.price || 0)}</strong></div>
            <div className="mt-2 flex justify-between text-sm"><span>Servicios adicionales</span><strong>{currency(addonTotal)}</strong></div>
            <div className="mt-2 flex justify-between text-sm"><span>Promocion activa</span><strong className="text-emerald-700">-{currency(discount)}</strong></div>
            {promotion && <p className="mt-1 text-xs text-emerald-700">{promotion.name}: {promotion.discountPercent}%</p>}
            <div className="mt-2 flex justify-between text-sm"><span>IVA estimado 15%</span><strong>{currency(tax)}</strong></div>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-black">Total</span><strong>{currency(total)}</strong></div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon="file" disabled={!isValid} onClick={save}>Guardar como borrador</Button>
      </div>
    </Modal>
  );
}
