# Solar Planner — Especificación Técnica Backend (MEAN Stack)

> Documento de referencia para implementación con Claude Code.  
> Stack: MongoDB · Express · Angular · Node.js · TypeScript · Mongoose · Zod

---

## 0. Contexto y alcance

Esta especificación cubre la extensión del backend de **Solar Planner** para:

1. Enriquecer el modelo de módulos FV en la colección `Panels` con parámetros físicos y térmicos.
2. Añadir pérdidas de sistema al modelo `Projects` mediante un subdocumento `systemLosses`.
3. Definir la semántica de los campos de producción (`prodToday`, `previousProd`, `nextProd`).
4. Integrar tres APIs externas: **Open-Meteo**, **PVGIS** y **ENTSO-E / REE**.
5. Implementar la lógica de actualización/caché de producción (cron + refresco bajo demanda).

No se añaden colecciones nuevas. Todo encaja en `Panels` y `Projects`.

---

## 1. Cambios en la colección `Panels`

### 1.1. Nuevos campos Mongoose (todos opcionales)

```ts
// panels.model.ts — añadir a PanelSchema

// Parámetros eléctricos STC
stcIsc: { type: Number },         // Corriente cortocircuito a STC (A)
stcVoc: { type: Number },         // Tensión circuito abierto a STC (V)
stcImp: { type: Number },         // Corriente en MPP a STC (A)
stcVmp: { type: Number },         // Tensión en MPP a STC (V)

// Térmica
gammaPmp: { type: Number },       // Coef. temperatura potencia (%/°C), ej. -0.35
noct:     { type: Number },       // Temperatura nominal operación célula (°C), ej. 45

// Bifacial
bifacial:          { type: Boolean },
bifacialityFactor: { type: Number, min: 0, max: 1 }, // relación trasera/delantera

// Degradación
degradationFirstYear: { type: Number, min: 0, max: 100 }, // % caída año 1
degradationAnnual:    { type: Number, min: 0, max: 100 }, // %/año desde año 2
```

> **Nota de migración:** el campo existente `temperatureCoefficient` puede mapearse a `gammaPmp` en la lógica de cálculo sin renombrarlo en BD. Documenta la equivalencia en el código para evitar confusión.

### 1.2. Extensión Zod — `PanelCreateSchema` / `PanelUpdateSchema`

```ts
// panels.schema.ts

const panelPhysicsExtension = z.object({
  stcIsc:               z.number().positive().optional(),
  stcVoc:               z.number().positive().optional(),
  stcImp:               z.number().positive().optional(),
  stcVmp:               z.number().positive().optional(),
  gammaPmp:             z.number().optional(),          // puede ser negativo
  noct:                 z.number().positive().optional(),
  bifacial:             z.boolean().optional(),
  bifacialityFactor:    z.number().min(0).max(1).optional(),
  degradationFirstYear: z.number().min(0).max(100).optional(),
  degradationAnnual:    z.number().min(0).max(100).optional(),
});

export const PanelCreateSchema = basePanelSchema.merge(panelPhysicsExtension);
export const PanelUpdateSchema = PanelCreateSchema.partial();
```

### 1.3. Valores por defecto de cálculo (cuando el campo no existe en BD)

| Campo                  | Default de cálculo |
|------------------------|--------------------|
| `gammaPmp`             | `-0.40` %/°C       |
| `noct`                 | `45` °C            |
| `bifacialityFactor`    | `0` (no bifacial)  |
| `degradationFirstYear` | `2.0` %            |
| `degradationAnnual`    | `0.5` %/año        |

### 1.4. Fuente de datos del catálogo

- **CEC (California Energy Commission)** — lista pública de módulos FV con `wattPeak`, `efficiency`, coeficientes de temperatura y metadatos de fabricante.
- **PVPMC (Sandia)** — datasets con parámetros de modelos tipo PVsyst/SAM derivados de la librería CEC.
- Para el TFG: cargar un **subset estático (CSV recortado)** de 5–10 módulos representativos. El diseño es compatible con importar la lista completa.

---

## 2. Cambios en la colección `Projects`

### 2.1. Subdocumento `systemLosses` (nuevo)

Captura pérdidas de sistema al estilo PVWatts pero desglosadas para explicabilidad al usuario.

```ts
// projects.model.ts — añadir subdocumento

const SystemLossesSchema = new Schema({
  inverterEfficiency: { type: Number, min: 0, max: 1 },   // ej. 0.97
  dcWiring:           { type: Number, min: 0, max: 100 },  // % pérd. cables DC, ej. 2
  acWiring:           { type: Number, min: 0, max: 100 },  // % pérd. cables AC, ej. 1
  mismatch:           { type: Number, min: 0, max: 100 },  // % mismatch, ej. 2
  soiling:            { type: Number, min: 0, max: 100 },  // % suciedad, ej. 3
  degradationExtra:   { type: Number, min: 0, max: 100 },  // % margen extra
  shadingStatic:      { type: Number, min: 0, max: 100 },  // % pérd. horizonte/obstáculos
}, { _id: false });

// En ProjectSchema añadir:
systemLosses: { type: SystemLossesSchema, default: {} },
```

#### Valores por defecto de cálculo para `systemLosses`

| Campo                | Default |
|----------------------|---------|
| `inverterEfficiency` | `0.96`  |
| `dcWiring`           | `2` %   |
| `acWiring`           | `1` %   |
| `mismatch`           | `2` %   |
| `soiling`            | `3` %   |
| `degradationExtra`   | `0` %   |
| `shadingStatic`      | `0` %   |

#### Dónde viven las pérdidas — resumen

| Tipo de pérdida                              | Ubicación                        |
|----------------------------------------------|----------------------------------|
| Coef. temperatura, NOCT                      | `Panels.gammaPmp`, `Panels.noct` |
| Degradación estructural del módulo           | `Panels.degradationFirstYear/Annual` |
| Inversor, cableado DC/AC, mismatch, suciedad | `Projects.systemLosses`          |
| Sombreado estático (horizonte, obstáculos)   | `Projects.systemLosses.shadingStatic` |

### 2.2. Semántica de los campos de producción

Sin cambios de esquema; se define el significado contractual:

| Campo          | Contenido                                                                 |
|----------------|---------------------------------------------------------------------------|
| `previousProd` | Ventana deslizante de los **últimos 7 días completos** anteriores a hoy  |
| `prodToday`    | Producción del **día en curso** desde 00:00 hasta "ahora" (máx. 24 pts) |
| `nextProd`     | Previsión de los **próximos 7–10 días** en resolución horaria            |
| `lastRefreshedAt` | Timestamp del último refresco de producción                           |
| `totalProd`    | Suma acumulada de energía generada (se actualiza en el cron nocturno)    |

Cada `ProductionPoint` = `{ dateTime: Date, pv: number }` (unidad: Wh o kWh — elegir una y documentarla).

#### Campos de versionado de modelo (opcionales, útiles para memoria TFG)

```ts
resourceModelVersion?: string;  // ej. "v1-openmeteo-pvgis"
pvModuleModelVersion?: string;  // ej. "pvwatts-like-v1"
```

### 2.3. Extensión Zod — `ProjectCreateSchema` / `ProjectUpdateSchema`

```ts
// projects.schema.ts

const SystemLossesZodSchema = z.object({
  inverterEfficiency: z.number().min(0).max(1).optional(),
  dcWiring:           z.number().min(0).max(100).optional(),
  acWiring:           z.number().min(0).max(100).optional(),
  mismatch:           z.number().min(0).max(100).optional(),
  soiling:            z.number().min(0).max(100).optional(),
  degradationExtra:   z.number().min(0).max(100).optional(),
  shadingStatic:      z.number().min(0).max(100).optional(),
}).optional();

// Añadir a ProjectCreateSchema y ProjectUpdateSchema:
systemLosses: SystemLossesZodSchema,
```

---

## 3. Endpoints — cambios y añadidos

La API existente **no se rompe**; solo se extienden esquemas y se añade un endpoint opcional.

### 3.1. Endpoints de `Panels` (`/api/panels`)

| Método | Ruta              | Cambio                                          |
|--------|-------------------|-------------------------------------------------|
| POST   | `/api/panels`     | Acepta nuevos campos opcionales de `§1.2`       |
| PUT    | `/api/panels/:id` | Idem, via `PanelUpdateSchema.partial()`         |
| GET    | `/api/panels`     | Sin cambios (devuelve campos nuevos si existen) |
| GET    | `/api/panels/:id` | Sin cambios                                     |

### 3.2. Endpoints de `Projects` (`/api/projects`)

| Método | Ruta                                    | Auth  | Descripción                                         |
|--------|-----------------------------------------|-------|-----------------------------------------------------|
| POST   | `/api/projects`                         | User  | Acepta `systemLosses` opcional                      |
| PUT    | `/api/projects/:id`                     | User  | Acepta `systemLosses` opcional                      |
| GET    | `/api/projects/:id`                     | User  | Dispara refresco bajo demanda si procede (§5.2)     |
| GET    | `/api/projects/dashboard`               | User  | Idem                                                |
| POST   | `/api/projects/:id/refresh-production`  | User  | **Nuevo (opcional)** — fuerza recálculo de producción |

#### Detalle del endpoint nuevo (opcional)

```
POST /api/projects/:id/refresh-production
Auth: Bearer JWT (usuario propietario)
Body: { forceFullRecalc?: boolean }
Response: { prodToday, previousProd, nextProd, lastRefreshedAt }
```

Útil para debugging y para botón "Actualizar" en el frontend. Si se prefiere mantener la lógica solo en el cron, este endpoint no es obligatorio.

---

## 4. Integración de APIs externas

### 4.1. Open-Meteo 🌤️

**Rol:** fuente principal de clima e irradiancia horaria (histórico + forecast).

**Variables clave a solicitar:**

```
global_tilted_irradiance   → irradiancia en el plano del generador (GTI)
shortwave_radiation
direct_normal_irradiance
diffuse_radiation
temperature_2m             → temperatura ambiente (para modelo térmico de módulo)
wind_speed_10m
relative_humidity_2m
cloud_cover
```

**Parámetros de geometría:**
- `tilt` → `Project.tilt`
- `azimuth` → `Project.azimuth`

**Ventana temporal:**
- Forecast: hasta 16 días.
- Histórico: endpoint `forecast` con fechas pasadas (o endpoint `historical`).

**Uso en producción:**
- `prodToday`: datos desde medianoche hasta hora actual.
- `nextProd`: forecast de los próximos 7–10 días.
- `previousProd`: datos históricos de los últimos 7 días.

**URL base:** `https://api.open-meteo.com/v1/forecast`

### 4.2. PVGIS ☀️

**Rol:** climatología de largo plazo + horizonte geográfico para pérdidas de sombreado estático.

**Usos en el proyecto:**

1. **Factor de sombreado estático** → derivar `systemLosses.shadingStatic` para la ubicación del proyecto.
2. **Calibración del modelo** → comparar energía anual/mensual calculada con Open-Meteo contra PVGIS.
3. **Contexto de producción anual** → base más robusta para cálculos de ROI y payback.

**Endpoint principal:** `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc` (o `seriescalc` para horario)

**Parámetros relevantes:**
```
lat, lon              → Project.lat, Project.lon
peakpower             → derivado de Project.panelNumber × Panel.wattPeak
loss                  → pérdidas totales (puede calcularse desde systemLosses)
angle                 → Project.tilt
aspect                → Project.azimuth
userhorizon / pvtechchoice
```

**Nota:** PVGIS no requiere API key. Respetar rate limits consultando con baja frecuencia (1 vez al crear proyecto o actualización mensual).

### 4.3. ENTSO-E / REE ⚡

**Rol:** precios horarios del mercado eléctrico, carga del sistema y generación renovable agregada.

**ENTSO-E — endpoints relevantes:**

| Dataset | Código | Uso |
|---------|--------|-----|
| Precios mercado day-ahead | `EnergyPrices_12.1.D_r3` | ROI, estrategia de batería |
| Carga total del sistema | `ActualTotalLoad_6.1.A_r3` | Contexto del sistema |
| Generación FV agregada | `AggregatedGenerationPerType` | Explicabilidad horas precio bajo |
| Forecast renovables | `GenerationForecastsForWindAndSolar` | Predicción precios |

**API key requerida:** sí (registro gratuito en `transparency.entsoe.eu`). Guardar en variable de entorno: `ENTSOE_API_KEY`.

**REE (España):**
- Datos de generación FV incluyendo autoconsumo y estadísticas de capacidad.
- URL: `https://apidatos.ree.es`
- Útil para calibrar factores medios a nivel país/región.

**Uso en la app:**
- Enriquecer cálculo de ROI con precio real del mercado (€/kWh horario).
- Storytelling: "Esta hora tiene precio bajo porque hay mucha generación solar/eólica".
- Estrategia de carga/descarga de batería si el proyecto la tiene.

---

## 5. Lógica de actualización de producción

### 5.1. Política de almacenamiento por proyecto

- `previousProd`: máximo 7 días × 24 puntos = **168 `ProductionPoint`**.
- `prodToday`: máximo **24 puntos** (resolución horaria).
- `nextProd`: 7–10 días × 24 puntos = **168–240 `ProductionPoint`**.
- Total por proyecto: ~400–500 puntos → razonable para MongoDB y dashboard.

### 5.2. Cron nocturno (job diario)

**Ejecutar a las ~00:15** hora del servidor (o ajustar por timezone del proyecto si es crítico).

```
Para cada Project:
  1. Concatenar prodToday del día que acaba → previousProd
  2. Recortar previousProd: mantener solo { dateTime >= now - 7 días }
  3. Vaciar prodToday = []
  4. Llamar Open-Meteo → recalcular nextProd (próximos 7–10 días)
  5. (Opcional) Actualizar totalProd += suma de prodToday del día que acaba
  6. Actualizar lastRefreshedAt = now
  7. Guardar documento
```

**Librería recomendada para cron en Node:** `node-cron` o `agenda`.

### 5.3. Refresco bajo demanda (al pedir datos de un proyecto)

Aplicar en el controlador de `GET /api/projects/:id` y `GET /api/projects/dashboard`.

```
THRESHOLD = 6 horas  (configurable via env var PRODUCTION_REFRESH_THRESHOLD_H)

1. Leer lastRefreshedAt del proyecto
2. Si (now - lastRefreshedAt) < THRESHOLD:
      → Devolver prodToday + previousProd + nextProd directamente (caché)
3. Si (now - lastRefreshedAt) >= THRESHOLD:
      a. Llamar Open-Meteo: recalcular prodToday (desde medianoche hasta now)
      b. (Opcional) Refinar nextProd con forecast más fresco
      c. Actualizar lastRefreshedAt = now
      d. Guardar y devolver nuevos datos
```

### 5.4. Pseudocódigo de cálculo de producción neta (un punto horario)

```
Inputs:
  gti          → Global Tilted Irradiance (W/m²) desde Open-Meteo
  t_amb        → Temperatura ambiente (°C) desde Open-Meteo
  panel        → Documento Panel (wattPeak, gammaPmp, noct, ...)
  project      → Documento Project (panelNumber, systemLosses, ...)
  year         → Año de operación del proyecto (para degradación)

Cálculo:
  // 1. Temperatura de módulo (modelo NOCT simplificado)
  t_cell = t_amb + (panel.noct - 20) * (gti / 800)

  // 2. Potencia DC por panel ajustada por temperatura
  delta_t = t_cell - 25
  p_stc   = panel.wattPeak                          // W a STC
  p_dc    = p_stc * (1 + panel.gammaPmp/100 * delta_t)

  // 3. Degradación por años de operación
  deg_factor = (1 - panel.degradationFirstYear/100)
             * (1 - panel.degradationAnnual/100) ^ (year - 1)
  p_dc = p_dc * deg_factor

  // 4. Irradiancia relativa a STC
  irr_factor = gti / 1000                           // STC = 1000 W/m²
  p_dc = p_dc * irr_factor

  // 5. Multiplicar por número de paneles
  p_array_dc = p_dc * project.panelNumber

  // 6. Aplicar pérdidas de sistema (de systemLosses, con defaults si faltan)
  losses = project.systemLosses
  p_ac = p_array_dc
       * (losses.inverterEfficiency ?? 0.96)
       * (1 - (losses.dcWiring        ?? 2) / 100)
       * (1 - (losses.acWiring        ?? 1) / 100)
       * (1 - (losses.mismatch        ?? 2) / 100)
       * (1 - (losses.soiling         ?? 3) / 100)
       * (1 - (losses.shadingStatic   ?? 0) / 100)
       * (1 - (losses.degradationExtra?? 0) / 100)

  // 7. Convertir a energía (resolución horaria: W → Wh)
  energy_wh = p_ac * 1h   // si gti ya es media horaria

Output:
  ProductionPoint { dateTime: <hora>, pv: energy_wh }
```

---

## 6. Variables de entorno necesarias

```env
# APIs externas
ENTSOE_API_KEY=xxxx

# Lógica de refresco
PRODUCTION_REFRESH_THRESHOLD_H=6   # horas antes de refrescar bajo demanda
PRODUCTION_HISTORY_DAYS=7          # días de histórico a mantener
PRODUCTION_FORECAST_DAYS=10        # días de forecast a calcular

# (Open-Meteo y PVGIS no requieren key)
```

---

## 7. Resumen de archivos a modificar / crear

| Archivo                                  | Tipo de cambio                                   |
|------------------------------------------|--------------------------------------------------|
| `panels.model.ts`                        | Añadir nuevos campos §1.1                        |
| `panels.schema.ts` (Zod)                 | Extender schemas §1.2                            |
| `projects.model.ts`                      | Añadir subdoc `systemLosses` §2.1                |
| `projects.schema.ts` (Zod)               | Extender schemas §2.3                            |
| `projects.controller.ts`                 | Añadir lógica refresco bajo demanda §5.3         |
| `projects.routes.ts`                     | Añadir ruta opcional `refresh-production` §3.2   |
| `services/production.service.ts`         | **Nuevo** — lógica de cálculo §5.4               |
| `services/openmeteo.service.ts`          | **Nuevo** — cliente HTTP Open-Meteo §4.1         |
| `services/pvgis.service.ts`              | **Nuevo** — cliente HTTP PVGIS §4.2              |
| `services/entsoe.service.ts`             | **Nuevo** — cliente HTTP ENTSO-E/REE §4.3        |
| `jobs/production-cron.job.ts`            | **Nuevo** — cron nocturno §5.2                   |

---

## 8. Notas para la memoria del TFG

- El subdocumento `systemLosses` sigue el enfoque de **"system losses"** de PVWatts (NREL), pero desglosado para mejorar la transparencia hacia el usuario.
- La separación entre pérdidas del módulo (`Panels`) y pérdidas de sistema (`Projects.systemLosses`) está alineada con la distinción IEA-PVPS entre "array capture losses" y "system losses".
- El modelo térmico de célula usa la aproximación NOCT simplificada (válida para simulaciones horarias a nivel de TFG).
- Las fuentes del catálogo de paneles (CEC + PVPMC/Sandia) son los estándares de la industria usados por SAM y PVsyst.
