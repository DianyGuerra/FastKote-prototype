# 🎉 FastKote Prototype

FastKote es un prototipo web para la gestión de cotizaciones del negocio **“Chichi Está de Fiesta”**.

El sistema permite registrar cotizaciones de eventos, trabajar con paquetes, productos, servicios, promociones y generar una recomendación inteligente mediante **Groq AI**.

> Proyecto académico desarrollado como modelo de apoyo a la decisión para la recomendación de paquetes y promociones.

---

## ✨ Funcionalidades

- 📋 Gestión de cotizaciones
- 🎁 Catálogo de paquetes y promociones
- 🛠️ Servicios adicionales
- 🤖 Recomendación inteligente con Groq
- 🧠 Fallback local basado en reglas
- 📦 Base de conocimiento en JSON
- 📄 Simulación de generación de cotizaciones

---

## 🏗️ Arquitectura

```text
Frontend React + Vite
        │
        ▼
 API /api/recommendation
        │
        ▼
 Backend Express
        │
        ├── Catálogo JSON
        ├── Motor de validación
        ├── Reglas fallback
        └── Groq API
        │
        ▼
 Panel de Recomendación
```

---

## 📋 Requisitos

- Node.js 18+
- npm
- API Key de Groq

Verificar instalación:

```bash
node -v
npm -v
```

---

## 🚀 Instalación

Clonar repositorio:

```bash
git clone https://github.com/DianyGuerra/FastKote-prototype.git
cd FastKote-prototype
```

Instalar dependencias:

```bash
npm install
```

---

## 🔐 Configuración

Crear archivo:

```bash
.env
```

Contenido:

```env
GROQ_API_KEY=tu_api_key
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

⚠️ Nunca subir el archivo `.env` a GitHub.

---

## ▶️ Ejecutar el proyecto

### Terminal 1 — Backend

```bash
npm run dev:api
```

Respuesta esperada:

```bash
FastKote recommendation API escuchando en http://localhost:3001
```

Comprobar salud:

```text
http://localhost:3001/api/health
```

Resultado:

```json
{
  "ok": true,
  "service": "fastkote-recommendation-api"
}
```

---

### Terminal 2 — Frontend

```bash
npm run dev
```

Abrir:

```text
http://localhost:5173
```

---

## 🧠 Recomendación Inteligente

El recomendador analiza:

- Tipo de evento
- Número de invitados
- Presupuesto
- Fecha
- Temática
- Lugar
- Preferencias

Luego consulta el catálogo y genera:

- Paquete recomendado
- Promoción aplicable
- Servicios sugeridos
- Precio estimado
- Nivel de ajuste
- Justificación

---

## 🛡️ Modo Fallback

Si Groq falla por cualquier motivo:

- API Key inválida
- Error de red
- Respuesta inválida
- Paquete inexistente

FastKote utiliza automáticamente un motor local basado en reglas.

Esto garantiza que la funcionalidad continúe disponible.

---

## 📂 Estructura Principal

```text
FastKote-prototype
│
├── server
│   ├── index.js
│   └── recommendationEngine.js
│
├── src
│   ├── components
│   ├── controllers
│   ├── views
│   ├── services
│   └── data
│
├── fastkote_catalogo.json
├── package.json
├── vite.config.js
└── README.md
```

---

## 🧪 Flujo de Prueba

1. Ejecutar backend.
2. Ejecutar frontend.
3. Abrir módulo de cotizaciones.
4. Crear nueva cotización.
5. Ingresar:

```text
Tipo de evento: Cumpleaños infantil
Invitados: 30
Presupuesto: $100
```

6. Revisar la recomendación generada.
7. Aplicar la recomendación.
8. Verificar que los elementos se agreguen a la cotización.

---

## 📜 Comandos

| Comando | Descripción |
|----------|------------|
| npm install | Instalar dependencias |
| npm run dev | Iniciar frontend |
| npm run dev:api | Iniciar backend |

---

## 🎓 Contexto Académico

FastKote fue desarrollado como un prototipo para evaluar un modelo de apoyo a la decisión basado en IA aplicado al negocio **“Chichi Está de Fiesta”**.

La solución combina:

- Base de conocimiento estructurada en JSON.
- Recomendación mediante Groq.
- Validación de respuestas.
- Reglas de respaldo (fallback).

El objetivo es asistir al administrador durante el proceso de cotización sin reemplazar su criterio profesional.

---

## 👩‍💻 Autores

**Diana Guerra** 
**Leonel Tipán** 
Universidad de las Fuerzas Armadas ESPE  
Proyecto académico FastKote