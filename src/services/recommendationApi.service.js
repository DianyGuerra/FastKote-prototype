import { recomendarPaquete } from "./recommendation.service";

const RECOMMENDATION_ENDPOINT = "/api/recommendation";

function hasRecommendationShape(recommendation) {
  return (
    recommendation &&
    typeof recommendation === "object" &&
    Object.prototype.hasOwnProperty.call(recommendation, "paqueteRecomendado") &&
    Object.prototype.hasOwnProperty.call(recommendation, "promocionAplicable") &&
    Array.isArray(recommendation.serviciosAdicionales) &&
    typeof recommendation.precioEstimado === "number" &&
    ["alto", "medio", "bajo"].includes(recommendation.nivelAjuste) &&
    typeof recommendation.justificacion === "string" &&
    typeof recommendation.necesitaMasDatos === "boolean"
  );
}

function getLocalFallback(datosEvento) {
  return {
    ...recomendarPaquete(datosEvento),
    origen: "fallback",
  };
}

export async function fetchRecommendation(datosEvento) {
  try {
    const response = await fetch(RECOMMENDATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ datosEvento }),
    });

    if (!response.ok) {
      throw new Error(`No se pudo consultar la recomendacion: ${response.status}`);
    }

    const recommendation = await response.json();
    return hasRecommendationShape(recommendation) ? recommendation : getLocalFallback(datosEvento);
  } catch {
    return getLocalFallback(datosEvento);
  }
}
