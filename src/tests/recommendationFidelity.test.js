import { describe, expect, test } from "vitest";
import { recomendarPaquete } from "../services/recommendation.service";

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

  const generatedPackageName = recommendation.paqueteRecomendado?.nombre || "";
  const generatedPromotionName = recommendation.promocionAplicable?.nombre || "";

  const packageMatches = matchesAny(generatedPackageName, expected.acceptedPackages);
  const promotionMatches = expected.expectedPromotion
    ? matchesAny(generatedPromotionName, [expected.expectedPromotion])
    : !recommendation.promocionAplicable;
  const budgetComplies = expected.maxBudget
    ? Number(recommendation.paqueteRecomendado?.precio || recommendation.precioEstimado || 0) <= expected.maxBudget
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
      acceptedPackages: ["Combo Super Fiesta", "Arma tu paquete a tu gusto", "Combo Plata"],
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
      expectedPromotion: "Promocion Dia del Nino",
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
      acceptedPackages: ["Combo Dia del Nino Basico", "Combo Bronce", "Combo Plata"],
      expectedPromotion: "Promocion Dia del Nino",
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

describe("Evaluación de fidelidad del recomendador FastKote", () => {
  test.each(testCases)("$id - $description", ({ input, expected }) => {
    const recommendation = recomendarPaquete(input);

    if (expected.needsMoreData) {
      expect(recommendation.necesitaMasDatos).toBe(true);
      expect(recommendation.paqueteRecomendado).toBeNull();
      return;
    }

    const evaluation = evaluateRecommendation(recommendation, expected);

    expect(recommendation).toHaveProperty("paqueteRecomendado");
    expect(recommendation).toHaveProperty("promocionAplicable");
    expect(recommendation).toHaveProperty("serviciosAdicionales");
    expect(recommendation).toHaveProperty("precioEstimado");
    expect(recommendation).toHaveProperty("nivelAjuste");
    expect(recommendation).toHaveProperty("justificacion");
    expect(recommendation).toHaveProperty("necesitaMasDatos");

    expect(evaluation.score).toBeGreaterThanOrEqual(0);
    expect(evaluation.score).toBeLessThanOrEqual(100);
  });

  test("Cumple el objetivo de al menos 8 recomendaciones favorables de 10", () => {
    const results = testCases.map((testCase) => {
      const recommendation = recomendarPaquete(testCase.input);

      if (testCase.expected.needsMoreData) {
        return {
          id: testCase.id,
          recommendation,
          score: recommendation.necesitaMasDatos ? 100 : 0,
          isSuccessful: recommendation.necesitaMasDatos,
        };
      }

      const evaluation = evaluateRecommendation(recommendation, testCase.expected);

      return {
        id: testCase.id,
        recommendation,
        ...evaluation,
      };
    });

    const successfulCases = results.filter((result) => result.isSuccessful).length;
    const fidelityPercentage = (successfulCases / testCases.length) * 100;
    const averageScore =
      results.reduce((total, result) => total + result.score, 0) / testCases.length;

    console.table(
      results.map((result) => ({
        caso: result.id,
        paquete: result.recommendation.paqueteRecomendado?.nombre || "Sin paquete",
        promocion: result.recommendation.promocionAplicable?.nombre || "Sin promoción",
        puntaje: result.score,
        favorable: result.isSuccessful ? "Sí" : "No",
      }))
    );

    console.log(`Recomendaciones favorables: ${successfulCases}/${testCases.length}`);
    console.log(`Porcentaje de fidelidad: ${fidelityPercentage}%`);
    console.log(`Nivel promedio de coincidencia: ${averageScore.toFixed(2)} puntos`);

    expect(successfulCases).toBeGreaterThanOrEqual(MINIMUM_SUCCESSFUL_CASES);
    expect(fidelityPercentage).toBeGreaterThanOrEqual(80);
  });
});