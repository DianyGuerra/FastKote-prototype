# Evaluacion live del recomendador IA FastKote

## Configuracion

- Fecha de ejecucion: 2026-07-06T15:56:25.234Z
- API evaluada: http://localhost:3001/api/recommendation
- Modelo reportado: llama-3.3-70b-versatile
- Pausa entre casos: 15000 ms

## Resumen

- Casos evaluados: 10
- Respuestas generadas por IA: 6/10
- Respuestas fallback: 4/10
- Errores de ejecucion: 0/10
- Recomendaciones favorables: 10/10
- Porcentaje de fidelidad: 100%
- Puntaje promedio: 97.5
- Tiempo promedio de respuesta: 1335.88 ms
- Objetivo experimental cumplido: No

## Resultados por caso

| Caso | Origen | Paquete | Promocion | Puntaje | Favorable | Tiempo ms | Motivo fallback/error |
|---|---|---|---|---:|---|---:|---|
| CP-01 | ia | Paquete Infantil Básico | Sin promocion | 95 | Si | 2197.04 | N/A |
| CP-02 | ia | Combo Bronce | Sin promocion | 95 | Si | 2219.47 | N/A |
| CP-03 | ia | Arma tu paquete a tu gusto | Sin promocion | 95 | Si | 1777 | N/A |
| CP-04 | ia | Combo Oro | Sin promocion | 95 | Si | 1697.7 | N/A |
| CP-05 | ia | Combo Día del Niño Básico | Día del Niño | 100 | Si | 2534.48 | N/A |
| CP-06 | ia | Combo Día del Niño Básico | Día del Niño | 95 | Si | 1431.17 | N/A |
| CP-07 | fallback | Combo Navideño Básico | Navidad | 100 | Si | 285.75 | Groq respondio 429: {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01k... |
| CP-08 | fallback | Combo Navideño Premium | Navidad | 100 | Si | 290.97 | Groq respondio 429: {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01k... |
| CP-09 | fallback | Combo Oro | Sin promocion | 100 | Si | 291.95 | Groq respondio 429: {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01k... |
| CP-10 | fallback | Sin paquete | Sin promocion | 100 | Si | 633.28 | Groq respondio 429: {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile` in organization `org_01k... |

## Interpretacion sugerida

La ejecucion live no alcanzo el objetivo minimo. Revisa los motivos de fallback/error para separar fallos de proveedor, limites de tasa, validacion de catalogo y calidad real de recomendacion.
