import { fetchRecommendation } from "../services/recommendationApi.service.js";
import { recomendarPaquete as recomendarPaqueteLocal } from "../services/recommendation.service.js";

export async function recomendarPaquete(datosEvento) {
  try {
    return await fetchRecommendation(datosEvento);
  } catch {
    return {
      ...recomendarPaqueteLocal(datosEvento),
      origen: "fallback",
    };
  }
}
