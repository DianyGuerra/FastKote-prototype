export const GROQ_RECOMMENDATION_PROMPT = `Eres un motor de recomendación para FastKote, sistema de cotizaciones del negocio "Chichi Está de Fiesta".

Analiza los datos del evento y recomienda el paquete, promoción, productos o servicios más adecuados usando únicamente el catálogo entregado.

No inventes paquetes, precios, promociones, servicios ni productos.
Evalúa todos los paquetes disponibles, no solo Combo Oro, Combo Plata y Combo Bronce.
Prioriza:
1. Tipo de evento.
2. Número de invitados.
3. Presupuesto estimado.
4. Fecha del evento.
5. Temática o necesidad visual.
6. Servicios adicionales útiles.

Si faltan datos mínimos como tipo de evento o número de invitados, devuelve necesitaMasDatos true.
Si no existe coincidencia exacta, recomienda la alternativa más cercana.
Si el presupuesto no alcanza, indícalo en la justificación.
Responde únicamente JSON válido, sin markdown ni texto adicional.`;

export function buildGroqRecommendationMessages(datosEvento, catalog) {
  return [
    {
      role: "system",
      content: GROQ_RECOMMENDATION_PROMPT,
    },
    {
      role: "user",
      content: [
        "Datos del evento:",
        JSON.stringify(datosEvento ?? {}, null, 2),
        "",
        "Catálogo FastKote disponible:",
        JSON.stringify(catalog ?? {}, null, 2),
        "",
        "Formato obligatorio de respuesta JSON:",
        JSON.stringify(
          {
            paqueteRecomendado: {
              id: "string",
              nombre: "string",
              precio: 0,
            },
            promocionAplicable: null,
            serviciosAdicionales: [],
            precioEstimado: 0,
            nivelAjuste: "alto | medio | bajo",
            justificacion: "string",
            necesitaMasDatos: false,
          },
          null,
          2,
        ),
      ].join("\n"),
    },
  ];
}
