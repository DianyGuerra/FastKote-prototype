import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildRecommendationCatalog } from "../src/services/recommendationCatalog.service.js";
import { buildGroqRecommendationMessages } from "../src/services/recommendationPrompt.service.js";
import { parseJsonResponse, recomendarPaquete, validateRecommendation, withRecommendationOrigin } from "./recommendationEngine.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localCatalogPath = path.resolve(__dirname, "../src/data/catalogoFastKote.json");
const rootCatalogPath = path.resolve(__dirname, "../fastkote_catalogo.json");

let catalogCache = null;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const [localCatalogContent, rootCatalogContent] = await Promise.all([readFile(localCatalogPath, "utf8"), readFile(rootCatalogPath, "utf8")]);
  catalogCache = buildRecommendationCatalog(JSON.parse(localCatalogContent), JSON.parse(rootCatalogContent));
  return catalogCache;
}

async function requestGroqRecommendation(datosEvento, catalog) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Falta GROQ_API_KEY en el entorno del backend.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildGroqRecommendationMessages(datosEvento, catalog),
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq respondio ${response.status}: ${detail}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  return parseJsonResponse(content);
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "fastkote-recommendation-api" });
});

app.post("/api/recommendation", async (request, response) => {
  const datosEvento = request.body?.datosEvento;
  const includeDiagnostics = request.body?.includeDiagnostics === true;

  if (!datosEvento || typeof datosEvento !== "object") {
    response.status(400).json({ error: "El body debe incluir datosEvento como objeto." });
    return;
  }

  try {
    const catalog = await loadCatalog();
    const fallback = withRecommendationOrigin(recomendarPaquete(datosEvento, catalog), "fallback");
    const aiStartedAt = Date.now();

    try {
      const groqRecommendation = await requestGroqRecommendation(datosEvento, catalog);
      const validatedRecommendation = validateRecommendation(groqRecommendation, catalog);
      const aiLatencyMs = Date.now() - aiStartedAt;

      if (!validatedRecommendation) {
        throw new Error("La recomendacion de Groq no coincide con el catalogo local.");
      }

      const aiResponse = withRecommendationOrigin(validatedRecommendation, "ia");
      response.json(
        includeDiagnostics
          ? {
              ...aiResponse,
              aiAttempted: true,
              aiSucceeded: true,
              model: groqModel,
              aiLatencyMs,
            }
          : aiResponse,
      );
      return;
    } catch (error) {
      console.warn(`[recommendation] usando fallback local: ${error.message}`);
      response.json(
        includeDiagnostics
          ? {
              ...fallback,
              aiAttempted: true,
              aiSucceeded: false,
              fallbackReason: error.message,
              model: groqModel,
              aiLatencyMs: Date.now() - aiStartedAt,
            }
          : fallback,
      );
    }
  } catch (error) {
    response.status(500).json({
      error: "No se pudo generar la recomendacion.",
      detail: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`FastKote recommendation API escuchando en http://localhost:${port}`);
});
