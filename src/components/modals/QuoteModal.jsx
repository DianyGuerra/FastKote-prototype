import { useState } from "react";
import { MIN_EVENT_DATE, TAX_RATE } from "../../models/businessRules.model";
import { timeToMinutes } from "../../services/calendar.service";
import { currency, getActivePromotion, isActive, roundMoney } from "../../services/quoteCalculation.service";
import { AppIcon } from "../ui/AppIcon";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/SelectField";

const eventTypes = ["Cumpleanos infantil", "Evento escolar", "Boda", "Cocteleria", "Mesa dulce", "Otro"];

function customItemsToForm(items = []) {
  return items.map((item) => ({ serviceId: item.serviceId, qty: Number(item.qty || 1) }));
}

function getSelectedService(services, serviceId) {
  return services.find((service) => service.id === serviceId);
}

export function QuoteModal({ clients, packages, packageMetrics, services, promotions, initialQuote = null, onClose, onSave }) {
  const activeClients = clients.filter(isActive);
  const activePackages = packages.filter(isActive);
  const activeServices = services.filter(isActive);
  const isEditing = Boolean(initialQuote);
  const initialQuoteType = initialQuote?.quoteType === "Personalizada" ? "Personalizada" : "Base";
  const [submitted, setSubmitted] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [form, setForm] = useState({
    clientId: initialQuote?.clientId || activeClients[0]?.id || "",
    responsibleName: initialQuote?.responsibleName || "",
    eventType: initialQuote?.eventType || eventTypes[0],
    guestCount: initialQuote?.guestCount || "",
    estimatedBudget: initialQuote?.estimatedBudget ?? "",
    eventLocation: initialQuote?.eventLocation || "",
    eventDate: initialQuote?.eventDate || MIN_EVENT_DATE,
    startTime: initialQuote?.startTime || "16:00",
    endTime: initialQuote?.endTime || "18:00",
    theme: initialQuote?.theme || "",
    requiresInvoice: initialQuote?.requiresInvoice ? "Si" : "No",
    commercialConditions: initialQuote?.commercialConditions || initialQuote?.observations || "",
    quoteType: initialQuoteType,
    packageId: initialQuoteType === "Base" ? initialQuote?.packageId || activePackages[0]?.id || "" : "",
  });
  const [customItems, setCustomItems] = useState(() => customItemsToForm(initialQuote?.customItems || initialQuote?.addons || []));

  const isBase = form.quoteType === "Base";
  const packageSelected = activePackages.find((packageItem) => packageItem.id === form.packageId);
  const packagePreview = packageMetrics.get(form.packageId);
  const baseSubtotal = isBase ? roundMoney(packagePreview?.price || 0) : 0;
  const customDetails = customItems
    .map((item) => {
      const service = getSelectedService(activeServices, item.serviceId);
      if (!service) return null;
      const qty = Number(item.qty || 0);
      return {
        service,
        qty,
        subtotal: roundMoney(service.price * qty),
      };
    })
    .filter(Boolean);
  const customSubtotal = roundMoney(customDetails.reduce((total, item) => total + item.subtotal, 0));
  const subtotal = isBase ? baseSubtotal : customSubtotal;
  const promotion = isBase ? getActivePromotion(promotions, form.packageId, form.eventDate, subtotal) : null;
  const discount = promotion ? roundMoney((subtotal * promotion.discountPercent) / 100) : 0;
  const tax = roundMoney(Math.max(subtotal - discount, 0) * TAX_RATE);
  const total = roundMoney(subtotal - discount + tax);
  const budget = Number(form.estimatedBudget || 0);
  const budgetDiff = roundMoney(total - budget);
  const selectedServiceIds = new Set(customItems.map((item) => item.serviceId));
  const visibleServices = activeServices.filter((service) => {
    const query = serviceSearch.trim().toLowerCase();
    return !selectedServiceIds.has(service.id) && (!query || service.name.toLowerCase().includes(query) || service.type.toLowerCase().includes(query));
  });

  const errors = {
    clientId: form.clientId ? "" : "Selecciona un cliente.",
    eventType: form.eventType ? "" : "Selecciona el tipo de evento.",
    guestCount: Number(form.guestCount) > 0 ? "" : "Ingresa un numero de invitados mayor que 0.",
    estimatedBudget: form.estimatedBudget === "" || Number(form.estimatedBudget) > 0 ? "" : "El presupuesto debe ser mayor que 0.",
    eventLocation: form.eventLocation.trim() ? "" : "Ingresa el lugar del evento.",
    eventDate: !form.eventDate ? "Selecciona una fecha." : form.eventDate < MIN_EVENT_DATE ? `La fecha minima es ${MIN_EVENT_DATE}.` : "",
    startTime: form.startTime ? "" : "Selecciona hora de inicio.",
    endTime: !form.endTime
      ? "Selecciona hora de fin."
      : timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)
        ? "La hora final debe ser mayor que la inicial."
        : "",
    packageId: !isBase || form.packageId ? "" : "Selecciona un paquete activo.",
    customItems: isBase || customDetails.length > 0 ? "" : "Agrega al menos un servicio o producto activo.",
    customQty: isBase || customItems.every((item) => Number(item.qty) > 0) ? "" : "Todas las cantidades deben ser mayores que 0.",
  };
  const isValid = Object.values(errors).every((error) => !error);

  const updateForm = (field, value) => {
    setForm((current) => {
      if (field === "quoteType") {
        return {
          ...current,
          quoteType: value,
          packageId: value === "Base" ? current.packageId || activePackages[0]?.id || "" : "",
        };
      }
      return { ...current, [field]: value };
    });
  };

  const addCustomItem = (serviceId) => {
    setCustomItems((current) => [...current, { serviceId, qty: 1 }]);
    setServiceSearch("");
  };

  const updateCustomQty = (serviceId, value) => {
    setCustomItems((current) =>
      current.map((item) => (item.serviceId === serviceId ? { ...item, qty: Math.max(0, Number(value) || 0) } : item)),
    );
  };

  const removeCustomItem = (serviceId) => {
    setCustomItems((current) => current.filter((item) => item.serviceId !== serviceId));
  };

  const save = () => {
    setSubmitted(true);
    if (!isValid) return;
    onSave({
      clientId: form.clientId,
      responsibleName: form.responsibleName.trim(),
      eventType: form.eventType,
      guestCount: Number(form.guestCount),
      estimatedBudget: form.estimatedBudget === "" ? null : Number(form.estimatedBudget),
      eventLocation: form.eventLocation.trim(),
      eventDate: form.eventDate,
      startTime: form.startTime,
      endTime: form.endTime,
      theme: form.theme.trim(),
      requiresInvoice: form.requiresInvoice === "Si",
      commercialConditions: form.commercialConditions.trim(),
      observations: form.commercialConditions.trim(),
      quoteType: form.quoteType,
      isPersonalized: !isBase,
      packageId: isBase ? form.packageId : null,
      customItems: isBase
        ? []
        : customDetails.map(({ service, qty, subtotal: itemSubtotal }) => ({
            serviceId: service.id,
            qty,
            unitPrice: service.price,
            subtotal: itemSubtotal,
          })),
    });
  };

  return (
    <Modal maxWidth="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">CU-SGC-L1-11 / L1-12 / RN-01</p>
          <h3 className="text-2xl font-black text-slate-950">{isEditing ? "Editar cotizacion" : "Generar cotizacion"}</h3>
          <p className="text-sm text-slate-500">{isEditing ? "Guarda una nueva version sin sobrescribir el historial." : "Registra datos del evento y separa cotizacion Base de Personalizada."}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-slate-100"><AppIcon name="close" className="h-6 w-6" /></button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-950">Datos generales del evento</h4>
                <p className="text-sm text-slate-500">Informacion comercial solicitada antes de calcular la propuesta.</p>
              </div>
              <Badge variant="Borrador">RN-01</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Cliente *" value={form.clientId} onChange={(value) => updateForm("clientId", value)} error={submitted ? errors.clientId : ""}>
                {activeClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </SelectField>
              <Field label="Responsable del evento" value={form.responsibleName} onChange={(value) => updateForm("responsibleName", value)} placeholder="Ej. Diana Guerra" />
              <SelectField label="Tipo de evento *" value={form.eventType} onChange={(value) => updateForm("eventType", value)} error={submitted ? errors.eventType : ""}>
                {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
              </SelectField>
              <Field label="Numero de invitados *" value={form.guestCount} onChange={(value) => updateForm("guestCount", value)} type="number" min="1" error={submitted ? errors.guestCount : ""} />
              <Field label="Presupuesto estimado" value={form.estimatedBudget} onChange={(value) => updateForm("estimatedBudget", value)} type="number" min="0" step="0.01" placeholder="Ej. 450" error={submitted ? errors.estimatedBudget : ""} />
              <Field label="Lugar / direccion del evento *" value={form.eventLocation} onChange={(value) => updateForm("eventLocation", value)} error={submitted ? errors.eventLocation : ""} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Fecha del evento *" value={form.eventDate} onChange={(value) => updateForm("eventDate", value)} type="date" min={MIN_EVENT_DATE} error={submitted ? errors.eventDate : ""} />
              <Field label="Hora inicio *" value={form.startTime} onChange={(value) => updateForm("startTime", value)} type="time" error={submitted ? errors.startTime : ""} />
              <Field label="Hora fin *" value={form.endTime} onChange={(value) => updateForm("endTime", value)} type="time" error={submitted ? errors.endTime : ""} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
              <Field label="Tematica o necesidad visual" value={form.theme} onChange={(value) => updateForm("theme", value)} placeholder="Ej. colores, personaje, estilo de mesa" />
              <SelectField label="Requiere factura / IVA" value={form.requiresInvoice} onChange={(value) => updateForm("requiresInvoice", value)}>
                <option>No</option>
                <option>Si</option>
              </SelectField>
            </div>
            <div className="mt-4">
              <Field label="Condiciones comerciales u observaciones" value={form.commercialConditions} onChange={(value) => updateForm("commercialConditions", value)} as="textarea" placeholder="Ej. anticipo, alcance, restricciones, notas del cliente" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="font-bold text-slate-950">Tipo de cotizacion *</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {["Base", "Personalizada"].map((quoteType) => (
                <button
                  key={quoteType}
                  type="button"
                  onClick={() => updateForm("quoteType", quoteType)}
                  className={`rounded-lg border p-4 text-left transition ${
                    form.quoteType === quoteType ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-bold text-slate-950">{quoteType}</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {quoteType === "Base" ? "Usa un paquete activo del catalogo comercial." : "Selecciona servicios/productos activos sin paquete base."}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          {isBase ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-4">
                <h4 className="font-bold text-slate-950">Paquete base</h4>
                <p className="text-sm text-slate-500">Cotizacion construida desde un paquete activo. No incluye items libres.</p>
              </div>
              <SelectField label="Paquete base activo *" value={form.packageId} onChange={(value) => updateForm("packageId", value)} error={submitted ? errors.packageId : ""}>
                {activePackages.map((packageItem) => <option key={packageItem.id} value={packageItem.id}>{packageItem.name}</option>)}
              </SelectField>
              {packageSelected && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                  <p className="font-bold text-slate-900">{packageSelected.name}</p>
                  <p className="mt-1 text-slate-500">{packageSelected.desc}</p>
                  <div className="mt-3 grid gap-2">
                    {(packageSelected.items || []).map((item) => {
                      const service = getSelectedService(services, item.serviceId);
                      return service ? <div key={item.serviceId} className="flex justify-between gap-3"><span>{service.name}</span><strong>x{item.qty}</strong></div> : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-950">Servicios y productos personalizados</h4>
                  <p className="text-sm text-slate-500">Construye una propuesta puntual sin modificar paquetes globales.</p>
                </div>
                <Badge variant="Activo">Solo activos</Badge>
              </div>
              <Field label="Buscar servicio/producto" value={serviceSearch} onChange={setServiceSearch} placeholder="Ej. granizado, transporte, cocteleria" />
              <div className="mt-3 grid max-h-48 gap-2 overflow-auto pr-1">
                {visibleServices.map((service) => (
                  <button key={service.id} type="button" onClick={() => addCustomItem(service.id)} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-left text-sm ring-1 ring-slate-100 hover:bg-violet-50">
                    <span>
                      <strong className="block text-slate-800">{service.name}</strong>
                      <span className="text-xs text-slate-500">{service.type} / {currency(service.price)} por unidad</span>
                    </span>
                    <AppIcon name="plus" className="h-4 w-4 text-violet-700" />
                  </button>
                ))}
                {!visibleServices.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No hay servicios activos disponibles con ese criterio.</p>}
              </div>
              <div className="mt-4 grid gap-2">
                {customDetails.map(({ service, qty, subtotal: itemSubtotal }) => (
                  <div key={service.id} className="grid grid-cols-[1fr_76px_90px_32px] items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                    <div>
                      <strong className="block text-slate-900">{service.name}</strong>
                      <span className="text-xs text-slate-500">{currency(service.price)} c/u</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(event) => updateCustomQty(service.id, event.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 [color-scheme:light]"
                    />
                    <strong className="text-right text-slate-900">{currency(itemSubtotal)}</strong>
                    <button type="button" onClick={() => removeCustomItem(service.id)} className="rounded-md p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><AppIcon name="close" className="h-4 w-4" /></button>
                  </div>
                ))}
                {submitted && (errors.customItems || errors.customQty) && <p className="text-xs font-semibold text-rose-600">{errors.customItems || errors.customQty}</p>}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div>
            <div className="mt-2 flex justify-between text-sm"><span>Promocion</span><strong className="text-emerald-700">-{currency(discount)}</strong></div>
            {promotion ? <p className="mt-1 text-xs text-emerald-700">{promotion.name}: {promotion.discountPercent}%</p> : <p className="mt-1 text-xs text-slate-500">Sin promocion aplicable</p>}
            <div className="mt-2 flex justify-between text-sm"><span>IVA estimado 15%</span><strong>{currency(tax)}</strong></div>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-black">Total</span><strong>{currency(total)}</strong></div>
            {budget > 0 && (
              <div className={`mt-3 rounded-lg p-3 text-sm ring-1 ${budgetDiff <= 0 ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
                {budgetDiff <= 0 ? "Dentro del presupuesto" : `Supera el presupuesto por ${currency(budgetDiff)}`}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
            Estado inicial: <strong>Borrador</strong>. Borrador y Enviada son tentativas; solo Aceptada bloquea calendario.
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon={isEditing ? "edit" : "file"} onClick={save}>{isEditing ? "Guardar nueva version" : "Guardar como borrador"}</Button>
      </div>
    </Modal>
  );
}
