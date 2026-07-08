import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_URL = process.env.FASTKOTE_RECOMMENDATION_API_URL || "http://localhost:3001/api/recommendation";
const HEALTH_URL = process.env.FASTKOTE_HEALTH_URL || API_URL.replace(/\/api\/recommendation$/, "/api/health");
const REPORTS_DIR = process.env.AI_EVAL_REPORTS_DIR || "reports";
const DELAY_BETWEEN_CASES_MS = 25000;
const MINIMUM_REQUIRED_SCORE = 80;
const MINIMUM_SUCCESSFUL_CASES = 8;

const testCases = [
  {
    id: "CP-01",
    description: "Cumpleanos infantil con 30 invitados y presupuesto cercano a 100 dolares",
    input: {
      eventType: "Cumpleanos infantil",
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
    description: "Cumpleanos infantil economico para 50 invitados",
    input: {
      eventType: "Cumpleanos infantil",
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
    description: "Cumpleanos infantil con presupuesto intermedio",
    input: {
      eventType: "Cumpleanos infantil",
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
    description: "Cumpleanos infantil premium con presupuesto alto",
    input: {
      eventType: "Cumpleanos infantil",
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
    description: "Dia del Nino dentro de fechas de promocion",
    input: {
      eventType: "Dia del Nino",
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
    description: "Evento escolar dentro de campana Dia del Nino",
    input: {
      eventType: "Evento escolar",
      guestCount: 20,
      estimatedBudget: 100,
      eventDate: "2026-05-29",
      theme: "ninos",
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
    description: "Evento navideno economico",
    input: {
      eventType: "Navidad",
      guestCount: 30,
      estimatedBudget: 60,
      eventDate: "2026-12-15",
      theme: "navidena",
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
    description: "Evento navideno con presupuesto premium",
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
    description: "Cumpleanos infantil con preferencia por fotos y videos",
    input: {
      eventType: "Cumpleanos infantil",
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    services.some((service) => matchesAny(service.nombre || service.name, [expectedService])),
  );
}

function evaluateRecommendation(recommendation, expected) {
  if (expected.needsMoreData) {
    return {
      score: recommendation.necesitaMasDatos ? 100 : 0,
      isSuccessful: Boolean(recommendation.necesitaMasDatos),
      packageMatches: true,
      promotionMatches: true,
      budgetComplies: true,
      serviceMatches: true,
      hasValidJustification: true,
    };
  }

  let score = 0;
  const packageName = recommendation.paqueteRecomendado?.nombre || "";
  const promotionName = recommendation.promocionAplicable?.nombre || "";
  const price = Number(recommendation.paqueteRecomendado?.precio || recommendation.precioEstimado || 0);
  const packageMatches = matchesAny(packageName, expected.acceptedPackages);
  const promotionMatches = expected.expectedPromotion
    ? matchesAny(promotionName, [expected.expectedPromotion])
    : !recommendation.promocionAplicable;
  const budgetComplies = expected.maxBudget ? price <= expected.maxBudget : true;
  const serviceMatches = hasExpectedService(recommendation.serviciosAdicionales, expected.expectedServices || []);
  const hasValidJustification = typeof recommendation.justificacion === "string" && recommendation.justificacion.trim().length >= 15;

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

function round(value) {
  return Number(value.toFixed(2));
}

function truncate(value, maxLength = 180) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function assertBackendIsRunning() {
  try {
    const response = await fetch(HEALTH_URL);
    if (!response.ok) throw new Error(`estado ${response.status}`);
  } catch (error) {
    throw new Error(`No se pudo conectar con el backend en ${HEALTH_URL}. Ejecuta primero: npm run dev:api. Detalle: ${error.message}`);
  }
}

async function requestRecommendation(datosEvento) {
  const startedAt = performance.now();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      datosEvento,
      includeDiagnostics: true,
    }),
  });
  const responseTimeMs = round(performance.now() - startedAt);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Backend respondio ${response.status}: ${truncate(detail, 500)}`);
  }

  return {
    recommendation: await response.json(),
    responseTimeMs,
  };
}

function buildSummary(results) {
  const successfulCases = results.filter((result) => result.isSuccessful).length;
  const aiResponses = results.filter((result) => result.origen === "ia").length;
  const fallbackResponses = results.filter((result) => result.origen === "fallback").length;
  const errors = results.filter((result) => result.origen === "error").length;
  const fidelityPercentage = round((successfulCases / testCases.length) * 100);
  const averageScore = round(results.reduce((total, result) => total + result.score, 0) / testCases.length);
  const averageResponseTime = round(results.reduce((total, result) => total + result.responseTimeMs, 0) / testCases.length);

  return {
    totalCases: testCases.length,
    successfulCases,
    minimumSuccessfulCases: MINIMUM_SUCCESSFUL_CASES,
    fidelityPercentage,
    minimumRequiredScore: MINIMUM_REQUIRED_SCORE,
    averageScore,
    averageResponseTime,
    aiResponses,
    fallbackResponses,
    errors,
    goalMet: aiResponses >= MINIMUM_SUCCESSFUL_CASES && successfulCases >= MINIMUM_SUCCESSFUL_CASES && fidelityPercentage >= 80,
  };
}

function buildMarkdownReport({ metadata, summary, results }) {
  const lines = [
    "# Evaluacion live del recomendador IA FastKote",
    "",
    "## Configuracion",
    "",
    `- Fecha de ejecucion: ${metadata.generatedAt}`,
    `- API evaluada: ${metadata.apiUrl}`,
    `- Modelo reportado: ${metadata.model || "No reportado"}`,
    `- Pausa entre casos: ${metadata.delayBetweenCasesMs} ms`,
    "",
    "## Resumen",
    "",
    `- Casos evaluados: ${summary.totalCases}`,
    `- Respuestas generadas por IA: ${summary.aiResponses}/${summary.totalCases}`,
    `- Respuestas fallback: ${summary.fallbackResponses}/${summary.totalCases}`,
    `- Errores de ejecucion: ${summary.errors}/${summary.totalCases}`,
    `- Recomendaciones favorables: ${summary.successfulCases}/${summary.totalCases}`,
    `- Porcentaje de fidelidad: ${summary.fidelityPercentage}%`,
    `- Puntaje promedio: ${summary.averageScore}`,
    `- Tiempo promedio de respuesta: ${summary.averageResponseTime} ms`,
    `- Objetivo experimental cumplido: ${summary.goalMet ? "Si" : "No"}`,
    "",
    "## Resultados por caso",
    "",
    "| Caso | Origen | Paquete | Promocion | Puntaje | Favorable | Tiempo ms | Motivo fallback/error |",
    "|---|---|---|---|---:|---|---:|---|",
    ...results.map((result) =>
      [
        result.id,
        result.origen,
        result.packageName,
        result.promotionName,
        result.score,
        result.isSuccessful ? "Si" : "No",
        result.responseTimeMs,
        truncate(result.fallbackReason || result.error || "N/A", 120).replace(/\|/g, "/"),
      ].join(" | "),
    ).map((row) => `| ${row} |`),
    "",
    "## Interpretacion sugerida",
    "",
    summary.goalMet
      ? "La ejecucion live alcanzo el objetivo minimo definido para respuestas IA y recomendaciones favorables."
      : "La ejecucion live no alcanzo el objetivo minimo. Revisa los motivos de fallback/error para separar fallos de proveedor, limites de tasa, validacion de catalogo y calidad real de recomendacion.",
  ];

  return `${lines.join("\n")}\n`;
}

async function runEvaluation() {
  await assertBackendIsRunning();

  const results = [];
  console.log(`Evaluando ${testCases.length} casos contra ${API_URL}`);
  console.log(`Pausa entre casos: ${DELAY_BETWEEN_CASES_MS} ms`);

  for (const [index, testCase] of testCases.entries()) {
    try {
      const { recommendation, responseTimeMs } = await requestRecommendation(testCase.input);
      const evaluation = evaluateRecommendation(recommendation, testCase.expected);
      const result = {
        id: testCase.id,
        description: testCase.description,
        input: testCase.input,
        expected: testCase.expected,
        recommendation,
        responseTimeMs,
        origen: recommendation.origen || "desconocido",
        packageName: recommendation.paqueteRecomendado?.nombre || "Sin paquete",
        promotionName: recommendation.promocionAplicable?.nombre || "Sin promocion",
        fallbackReason: recommendation.fallbackReason || "",
        aiAttempted: recommendation.aiAttempted ?? null,
        aiSucceeded: recommendation.aiSucceeded ?? null,
        model: recommendation.model || null,
        aiLatencyMs: recommendation.aiLatencyMs ?? null,
        ...evaluation,
      };
      results.push(result);
      console.log(`${testCase.id}: ${result.origen}, ${result.score} puntos, ${result.responseTimeMs} ms`);
    } catch (error) {
      results.push({
        id: testCase.id,
        description: testCase.description,
        input: testCase.input,
        expected: testCase.expected,
        recommendation: null,
        responseTimeMs: 0,
        origen: "error",
        packageName: "Sin paquete",
        promotionName: "Sin promocion",
        score: 0,
        isSuccessful: false,
        error: error.message,
      });
      console.log(`${testCase.id}: error - ${error.message}`);
    }

    if (index < testCases.length - 1 && DELAY_BETWEEN_CASES_MS > 0) {
      await sleep(DELAY_BETWEEN_CASES_MS);
    }
  }

  const summary = buildSummary(results);
  const generatedAt = new Date().toISOString();
  const fileStamp = generatedAt.replace(/[:.]/g, "-");
  const metadata = {
    generatedAt,
    apiUrl: API_URL,
    healthUrl: HEALTH_URL,
    delayBetweenCasesMs: DELAY_BETWEEN_CASES_MS,
    model: results.find((result) => result.model)?.model || null,
  };
  const report = {
    metadata,
    summary,
    results,
  };
  const jsonPath = path.join(REPORTS_DIR, `ai-evaluation-${fileStamp}.json`);
  const markdownPath = path.join(REPORTS_DIR, `ai-evaluation-${fileStamp}.md`);
  const latestJsonPath = path.join(REPORTS_DIR, "ai-evaluation-latest.json");
  const latestMarkdownPath = path.join(REPORTS_DIR, "ai-evaluation-latest.md");

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, buildMarkdownReport(report), "utf8");
  await writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(latestMarkdownPath, buildMarkdownReport(report), "utf8");

  console.table(
    results.map((result) => ({
      caso: result.id,
      origen: result.origen,
      paquete: result.packageName,
      promocion: result.promotionName,
      puntaje: result.score,
      favorable: result.isSuccessful ? "Si" : "No",
      tiempoMs: result.responseTimeMs,
      motivo: truncate(result.fallbackReason || result.error || "", 60),
    })),
  );

  console.log(`Respuestas IA: ${summary.aiResponses}/${summary.totalCases}`);
  console.log(`Fallbacks: ${summary.fallbackResponses}/${summary.totalCases}`);
  console.log(`Favorables: ${summary.successfulCases}/${summary.totalCases}`);
  console.log(`Reporte JSON: ${jsonPath}`);
  console.log(`Reporte Markdown: ${markdownPath}`);
}

runEvaluation().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
