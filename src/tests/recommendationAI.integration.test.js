import { describe, expect, test } from "vitest";

const API_URL = "http://localhost:3001/api/recommendation";
const MINIMUM_REQUIRED_SCORE = 80;
const MINIMUM_SUCCESSFUL_CASES = 8;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAny(value, expectedValues = []) {
  const normalizedValue = normalizeText(value);

  return expectedValues.some((expected) => {
    const normalizedExpected = normalizeText(expected);
    return (
      normalizedValue === normalizedExpected ||
      normalizedValue.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedValue)
    );
  });
}

function hasExpectedService(services = [], expectedServices = []) {
  if (!expectedServices.length) return true;

  return expectedServices.some((expectedService) =>
    services.some((service) =>
      matchesAny(service.nombre || service.name, [expectedService])
    )
  );
}

function evaluateRecommendation(recommendation, expected) {
  let score = 0;

  const packageName = recommendation.paqueteRecomendado?.nombre || "";
  const promotionName = recommendation.promocionAplicable?.nombre || "";
  const price = Number(
    recommendation.paqueteRecomendado?.precio ||
      recommendation.precioEstimado ||
      0
  );

  const packageMatches = matchesAny(packageName, expected.acceptedPackages);

  const promotionMatches = expected.expectedPromotion
    ? matchesAny(promotionName, [expected.expectedPromotion])
    : !recommendation.promocionAplicable;

  const budgetComplies = expected.maxBudget
    ? price <= expected.maxBudget
    : true;

  const serviceMatches = hasExpectedService(
    recommendation.serviciosAdicionales,
    expected.expectedServices || []
  );

  const hasValidJustification =
    typeof recommendation.justificacion === "string" &&
    recommendation.justificacion.trim().length >= 15;

  if (packageMatches) score += 40;
  if (expected.eventRelationValid) score += 20;
  if (budgetComplies) score += 15;
  if (promotionMatches) score += 15;
  if (serviceMatches) score += 5;
  if (hasValidJustification) score += 5;

  return {
    score,
    isSuccessful: score >= MINIMUM_REQUIRED_SCORE,
    packageMatches,
    promotionMatches,
    budgetComplies,
    serviceMatches,
    hasValidJustification,
  };
}

async function requestAIRecommendation(datosEvento) {
  const start = performance.now();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ datosEvento }),
  });

  const end = performance.now();

  if (!response.ok) {
    throw new Error(`Backend respondió con estado ${response.status}`);
  }

  const recommendation = await response.json();

  return {
    recommendation,
    responseTimeMs: Number((end - start).toFixed(2)),
  };
}

const testCases = [
  {
    id: "CP-01",
    description: "Cumpleaños infantil con 30 invitados y presupuesto cercano a 100 dólares",
    input: {
      eventType: "Cumpleaños infantil",
      guestCount: 30,
      estimatedBudget: 100,
      eventDate: "2026-07-10",
      theme: "infantil",
      eventLocation: "Local",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Super Fiesta", "Arma tu paquete a tu gusto", "Paquete Infantil Basico"],
      expectedPromotion: null,
      maxBudget: 100,
      expectedServices: ["Pinata personalizada", "Estacion de granizados", "Area de juegos"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-02",
    description: "Cumpleaños infantil económico para 50 invitados",
    input: {
      eventType: "Cumpleaños infantil",
      guestCount: 50,
      estimatedBudget: 75,
      eventDate: "2026-07-15",
      theme: "snacks",
      eventLocation: "Local",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Bronce"],
      expectedPromotion: null,
      maxBudget: 75,
      expectedServices: ["Pinata personalizada", "Estacion de granizados", "Area de juegos"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-03",
    description: "Cumpleaños infantil con presupuesto intermedio",
    input: {
      eventType: "Cumpleaños infantil",
      guestCount: 50,
      estimatedBudget: 100,
      eventDate: "2026-07-20",
      theme: "snacks variados",
      eventLocation: "Local",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Plata", "Arma tu paquete a tu gusto", "Combo Super Fiesta"],
      expectedPromotion: null,
      maxBudget: 100,
      expectedServices: ["Pinata personalizada", "Estacion de granizados", "Area de juegos"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-04",
    description: "Cumpleaños infantil premium con presupuesto alto",
    input: {
      eventType: "Cumpleaños infantil",
      guestCount: 50,
      estimatedBudget: 120,
      eventDate: "2026-07-22",
      theme: "premium",
      eventLocation: "Local",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Oro"],
      expectedPromotion: null,
      maxBudget: 120,
      expectedServices: ["Pinata personalizada", "Estacion de granizados", "Area de juegos"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-05",
    description: "Día del Niño dentro de fechas de promoción",
    input: {
      eventType: "Dia del Niño",
      guestCount: 25,
      estimatedBudget: 150,
      eventDate: "2026-05-30",
      theme: "evento infantil escolar",
      eventLocation: "Escuela",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Dia del Nino Basico", "Combo Dia del Nino Premium"],
      expectedPromotion: "Dia del Nino",
      maxBudget: 150,
      expectedServices: [],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-06",
    description: "Evento escolar dentro de campaña Día del Niño",
    input: {
      eventType: "Evento escolar",
      guestCount: 20,
      estimatedBudget: 100,
      eventDate: "2026-05-29",
      theme: "niños",
      eventLocation: "Unidad educativa",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Dia del Nino Basico", "Combo Plata", "Combo Bronce"],
      expectedPromotion: "Dia del Nino",
      maxBudget: 100,
      expectedServices: ["Estacion de granizados"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-07",
    description: "Evento navideño económico",
    input: {
      eventType: "Navidad",
      guestCount: 30,
      estimatedBudget: 60,
      eventDate: "2026-12-15",
      theme: "navideña",
      eventLocation: "Empresa",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Navideno Basico"],
      expectedPromotion: "Navidad",
      maxBudget: 60,
      expectedServices: [],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-08",
    description: "Evento navideño con presupuesto premium",
    input: {
      eventType: "Navidad",
      guestCount: 30,
      estimatedBudget: 80,
      eventDate: "2026-12-20",
      theme: "premium navidad",
      eventLocation: "Empresa",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: ["Combo Navideno Premium"],
      expectedPromotion: "Navidad",
      maxBudget: 80,
      expectedServices: [],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-09",
    description: "Cumpleaños infantil con preferencia por fotos y videos",
    input: {
      eventType: "Cumpleaños infantil",
      guestCount: 30,
      estimatedBudget: 130,
      eventDate: "2026-08-01",
      theme: "fotos videos recuerdos entretenimiento",
      eventLocation: "Local",
      commercialConditions: "Cliente desea recuerdos del evento",
      clientPreferences: "Photo Booth, fotos y videos",
    },
    expected: {
      acceptedPackages: ["Combo Super Fiesta", "Combo Oro", "Arma tu paquete a tu gusto"],
      expectedPromotion: null,
      maxBudget: 130,
      expectedServices: ["Photo Booth 360"],
      eventRelationValid: true,
    },
  },
  {
    id: "CP-10",
    description: "Datos incompletos del evento",
    input: {
      eventType: "",
      guestCount: 0,
      estimatedBudget: 100,
      eventDate: "2026-08-05",
      theme: "",
      eventLocation: "",
      commercialConditions: "",
    },
    expected: {
      acceptedPackages: [],
      expectedPromotion: null,
      maxBudget: null,
      expectedServices: [],
      eventRelationValid: true,
      needsMoreData: true,
    },
  },
];

describe("Evaluación de integración del recomendador IA FastKote", () => {
  test(
    "Cumple el objetivo de al menos 8 recomendaciones favorables de 10 usando backend/Groq",
    async () => {
      const results = [];

      for (const testCase of testCases) {
        const { recommendation, responseTimeMs } = await requestAIRecommendation(
          testCase.input
        );

        if (testCase.expected.needsMoreData) {
          results.push({
            id: testCase.id,
            recommendation,
            responseTimeMs,
            score: recommendation.necesitaMasDatos ? 100 : 0,
            isSuccessful: recommendation.necesitaMasDatos,
            origen: recommendation.origen || "desconocido",
          });
          continue;
        }

        const evaluation = evaluateRecommendation(
          recommendation,
          testCase.expected
        );

        results.push({
          id: testCase.id,
          recommendation,
          responseTimeMs,
          origen: recommendation.origen || "desconocido",
          ...evaluation,
        });
      }

      const successfulCases = results.filter((result) => result.isSuccessful).length;
      const fidelityPercentage = (successfulCases / testCases.length) * 100;
      const averageScore =
        results.reduce((total, result) => total + result.score, 0) /
        testCases.length;
      const averageResponseTime =
        results.reduce((total, result) => total + result.responseTimeMs, 0) /
        testCases.length;

      console.table(
        results.map((result) => ({
          caso: result.id,
          origen: result.origen,
          paquete: result.recommendation.paqueteRecomendado?.nombre || "Sin paquete",
          promocion:
            result.recommendation.promocionAplicable?.nombre || "Sin promoción",
          puntaje: result.score,
          favorable: result.isSuccessful ? "Sí" : "No",
          tiempoMs: result.responseTimeMs,
        }))
      );

      console.log(`Recomendaciones favorables: ${successfulCases}/10`);
      console.log(`Porcentaje de fidelidad IA: ${fidelityPercentage}%`);
      console.log(`Nivel promedio de coincidencia: ${averageScore.toFixed(2)} puntos`);
      console.log(`Tiempo promedio de respuesta: ${averageResponseTime.toFixed(2)} ms`);

      const aiResponses = results.filter((result) => result.origen === "ia").length;
      console.log(`Respuestas generadas por IA: ${aiResponses}/10`);

      expect(aiResponses).toBeGreaterThanOrEqual(8);
      expect(successfulCases).toBeGreaterThanOrEqual(MINIMUM_SUCCESSFUL_CASES);
      expect(fidelityPercentage).toBeGreaterThanOrEqual(80);
    },
    120000
  );
});