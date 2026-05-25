# Solar Planner v2 — Estado de Implementación del Backend

> Documento de referencia para toma de decisiones sobre implementaciones pendientes.
> Generado comparando el código actual contra `solar-planner-backend-spec.md` y `solar-planner-2.0-calculations.md`.
> Stack: Node.js · Express · TypeScript · MongoDB/Mongoose · Zod

---

## Contexto del proyecto

Solar Planner v2 es una aplicación web de TFG que ayuda a propietarios de viviendas, agricultores y pequeñas empresas a evaluar la inversión en paneles solares. El backend calcula producción fotovoltaica horaria usando tres APIs externas (Open-Meteo, PVGIS, ENTSO-E) y expone métricas de rendimiento y económicas.

---

## 1. Implementado completamente ✅

### 1.1 Modelo de datos — Colección `Panels`

Todos los campos físicos y térmicos definidos en la spec §1.1 están en `panels.model.ts`:

| Campo | Tipo Mongoose | Estado |
|-------|--------------|--------|
| `stcIsc` | Number | ✅ |
| `stcVoc` | Number | ✅ |
| `stcImp` | Number | ✅ |
| `stcVmp` | Number | ✅ |
| `gammaPmp` | Number (%/°C) | ✅ |
| `noct` | Number (°C) | ✅ |
| `bifacial` | Boolean | ✅ |
| `bifacialityFactor` | Number [0–1] | ✅ |
| `degradationFirstYear` | Number [0–100] % | ✅ |
| `degradationAnnual` | Number [0–100] %/año | ✅ |

Los schemas Zod (`PanelCreateSchema` / `PanelUpdateSchema`) también extienden todos estos campos como opcionales (spec §1.2).

**Defaults de cálculo** cuando el campo no existe en BD (spec §1.3), implementados en `production.service.ts`:

```typescript
const PANEL_DEFAULTS = {
  gammaPmp: -0.40,          // %/°C
  noct: 45,                 // °C
  bifacialityFactor: 0,
  degradationFirstYear: 2.0, // %
  degradationAnnual: 0.5,   // %/año
};
```

---

### 1.2 Modelo de datos — Colección `Projects`

#### Subdocumento `systemLosses` (spec §2.1)

`SystemLossesSchema` en `projects.model.ts` con todos los campos:

| Campo | Default de cálculo | Estado |
|-------|--------------------|--------|
| `inverterEfficiency` | 0.96 | ✅ |
| `dcWiring` | 2 % | ✅ |
| `acWiring` | 1 % | ✅ |
| `mismatch` | 2 % | ✅ |
| `soiling` | 3 % | ✅ |
| `degradationExtra` | 0 % | ✅ |
| `shadingStatic` | 0 % | ✅ (campo existe, cálculo automático NO — ver §3.3) |

Schema Zod `SystemLossesZodSchema` añadido a `ProjectCreateSchema` y `ProjectUpdateSchema` (spec §2.3). ✅

#### Campos de versionado y estado (spec §2.2)

```typescript
lastRefreshedAt?: Date;         // ✅ — usado en lógica de refresco
resourceModelVersion?: string;  // ✅ — en modelo, no se popula todavía
pvModuleModelVersion?: string;  // ✅ — en modelo, no se popula todavía
```

#### Subdocumento `pvgisRef`

```typescript
pvgisRef: {
  yearlyKwh: number;
  yearlyKwhPerKwp: number;
  monthlyKwh: number[];         // array 12 elementos
  yearlyPOAIrradiation?: number; // H(i)_y — para Performance Ratio
}
```
✅ Persistido en BD y retornado en `ProjectResponse`.

#### Campo `dcAcRatio`

```typescript
dcAcRatio?: number; // Default 1.1 (PVWatts V5)
```
✅ Persistido en modelo y usado en el cálculo del clipping del inversor.

---

### 1.3 Endpoints (spec §3)

Todos los endpoints definidos están implementados:

| Método | Ruta | Estado |
|--------|------|--------|
| POST | `/api/panels` | ✅ acepta nuevos campos físicos |
| PUT | `/api/panels/:id` | ✅ |
| GET | `/api/panels`, `/:id` | ✅ |
| POST | `/api/projects` | ✅ acepta `systemLosses` |
| PUT | `/api/projects/:id` | ✅ acepta `systemLosses` |
| GET | `/api/projects/:id` | ✅ dispara refresco bajo demanda |
| GET | `/api/projects/dashboard` | ✅ |
| POST | `/api/projects/:id/refresh-production` | ✅ acepta `forceFullRecalc` |
| GET | `/api/projects/:id/analytics` | ✅ CF, PR, ahorro anual, proyección 25 años |

---

### 1.4 Integración APIs externas (spec §4)

#### Open-Meteo (spec §4.1)

Servicio `openmeteo.service.ts` implementado:
- Variables obtenidas: `global_tilted_irradiance` (GTI, ya corregido por tilt/azimuth), `temperature_2m`, `wind_speed_10m`
- Parámetros enviados: `tilt`, `azimuth` (convertido a convención Open-Meteo: 0=Sur, ±90=E/O)
- Soporta `past_days` (histórico) y `forecast_days` (previsión)
- **Nota importante:** Open-Meteo devuelve GTI en el plano del generador directamente. No es necesario calcular POA desde componentes DNI/DHI porque la API ya hace la transposición geométrica.

#### PVGIS (spec §4.2)

Servicio `pvgis.service.ts` implementado:
- Endpoint usado: `/api/v5_2/PVcalc`
- Parámetros: `lat`, `lon`, `peakpower` (panelNumber × wattPeak), `loss` (calculado desde `systemLosses`), `angle` (tilt), `aspect` (azimuth)
- Datos retornados: `yearlyKwh`, `yearlyKwhPerKwp`, `monthlyKwh[12]`, `yearlyPOAIrradiation`
- Se llama **una vez al crear el proyecto** (referencia de largo plazo)
- Función `computeTotalSystemLossPct()` convierte los campos de `systemLosses` a un único % para el parámetro `loss` de PVGIS

#### ENTSO-E (spec §4.3)

Servicio `entsoe.service.ts` implementado:
- Dataset: `EnergyPrices_12.1.D_r3` (precios day-ahead)
- 10 países soportados: ES, PT, DE, FR, IT, GB, NL, BE, PL, AT
- Devuelve precio **medio diario** de ayer en moneda local por kWh
- Se llama al crear/actualizar proyecto para obtener precio de referencia
- Requiere `ENTSOE_API_KEY` en variables de entorno

---

### 1.5 Lógica de producción (spec §5 + calculations §1–3)

#### Cron nocturno (spec §5.2)

`scheduler.service.ts` implementado con `node-schedule`:
- Job por proyecto con timezone del proyecto
- Lógica de rolling window: `prodToday` → `previousProd` (recorte a 7 días), `previousProd` vacío
- Refresco de `nextProd` desde Open-Meteo
- Acumulación de `totalProd`
- Catch-up en arranque del servidor (proyectos stale)
- Locking por proyecto (previene ejecuciones solapadas)

#### Refresco bajo demanda (spec §5.3)

En `project.service.ts → getProjectById()` y `getUserDashboard()`:
- Umbral configurable via `PRODUCTION_REFRESH_THRESHOLD_H` (default: 6h)
- Si `now - lastRefreshedAt >= threshold`: recalcula `prodToday` + `nextProd`
- `previousProd` no se toca en este flujo

#### Modelo de cálculo horario (calculations §1.3 + §2.1 + §3)

`production.service.ts → calculateHourlyOutputKwh()` — pipeline de 8 pasos:

```
1. T_cell = T_amb + GTI / (U₀ + U₁ × windSpeed)
   U₀/U₁ derivados de NOCT via PVWatts V5: uSum = 800/(NOCT-20), U₁/U₀ = 0.274

2. P_dc_per_panel = wattPeak × (1 + γ/100 × (T_cell - 25))

3. deg_factor = (1 - dfy/100) × (1 - da/100)^(year-1)

4. P_array_dc = P_dc_per_panel × deg_factor × (GTI/1000) × panelNumber

5. DC losses = × (1 - dcWiring/100) × (1 - mismatch/100) × (1 - soiling/100)
              × (1 - shadingStatic/100) × (1 - degradationExtra/100)

6. Inverter: P_ac = min(P_dc_loss × η_inv, P_ac_nameplate)
   P_ac_nameplate = panelNumber × wattPeak / dcAcRatio

7. AC wiring: P_ac_final = P_ac × (1 - acWiring/100)

8. Energy: kWh = max(0, P_ac_final / 1000)  [W × 1h = Wh → kWh]
```

#### Métricas analíticas (calculations §8)

`project.service.ts → getProjectAnalytics()`:
- **Capacity Factor:** `CF(%) = 100 × yearlyKwh / (Pdc0_kW × 8760)` ✅
- **Performance Ratio:** `PR(%) = 100 × yearlyKwh / (Pdc0_kW × H(i)_y)` ✅ (null para proyectos sin `yearlyPOAIrradiation`)
- **Ahorro anual:** `yearlyKwh × price` ✅ (null si no hay `price`)
- **Proyección 25 años:** savings con degradación aplicada por año ✅

---

## 2. Pendiente de implementar ❌

### Gap 1 — `installationCost` + Payback + ROI (spec §5.2 / calculations §5.2)

**Estado actual:** Explícitamente marcado como `TODO` en el código.

```typescript
// projects.model.ts
// TODO: installationCost — total system cost (panels + inverter/batteries + labor).
// Cost model research pending (panel DB prices + inverter collection + labor estimate API).

// project.service.ts (analytics)
// TODO: paybackYears = installationCost / annualSavingsEur once installationCost is added to IProject
// TODO: roi25Years = 100 * (sum(annualSavingsPerYear) - installationCost) / installationCost
```

**Qué falta implementar:**

1. Campo `installationCost?: number` en `IProject` (Mongoose + Zod)
2. Endpoint `PUT /projects/:id` debe aceptar `installationCost`
3. En analytics, calcular:

```
paybackYears = installationCost / annualSavingsEur

roi25Years(%) = 100 × (Σ annualSavingsPerYear[i] - installationCost) / installationCost
```

**Preguntas abiertas para Perplexity:**
- ¿Cómo modelar `installationCost`? ¿Campo libre introducido por el usuario? ¿O estimación automática (€/Wp × wattPeak × panelNumber + coste fijo inversor)?
- ¿Existe una fuente contrastada (IRENA, NREL) para costes de instalación residencial en Europa por país/año que se pueda usar como referencia de estimación?
- ¿El payback simple es suficiente para el TFG o se debe implementar el VAN (Valor Actual Neto) con tasa de descuento?

---

### Gap 2 — Cálculo automático de `shadingStatic` desde PVGIS (calculations §4.1)

**Estado actual:** El campo `systemLosses.shadingStatic` existe en el modelo y puede introducirse manualmente. No hay cálculo automático.

**Qué define la spec:**

```
shadingStatic(%) = 100 × (E_ideal - E_real) / E_ideal

donde:
  E_ideal = producción anual PVGIS sin horizonte (llamada sin userhorizon)
  E_real  = producción anual PVGIS con horizonte geográfico (llamada con userhorizon)
```

Requeriría dos llamadas a PVGIS `/PVcalc` al crear el proyecto:
1. Sin `userhorizon` → obtener `E_ideal`
2. Con `userhorizon` (perfil del horizonte geográfico) → obtener `E_real`

**Problemas identificados:**
- PVGIS proporciona el horizonte geográfico automáticamente con el parámetro `usehorizon=1`, pero el "horizon profile" personalizado por obstáculos físicos del emplazamiento requiere datos de campo que el usuario no puede proveer fácilmente
- Hacer dos llamadas a PVGIS duplica el tiempo de creación del proyecto y el consumo del rate limit
- El horizonte geográfico de PVGIS modela montañas/colinas, no obstáculos próximos (edificios, árboles)

**Preguntas abiertas para Perplexity:**
- ¿Cuál es la diferencia práctica entre `usehorizon=0` y `usehorizon=1` en PVGIS y en qué escenarios afecta significativamente a `E_real`?
- ¿Es viable/útil calcular `shadingStatic` automáticamente para un TFG, o es suficiente con que sea un campo de entrada manual con documentación de valores típicos por entorno (urbano/rural/montaña)?
- ¿Existe alguna fuente (Solargis, PVGIS docs) con valores típicos de pérdida por horizonte por tipo de emplazamiento que permitan proponer un default contextual?

---

### Gap 3 — Curva de eficiencia del inversor PVWatts V5 (calculations §3.1)

**Estado actual:** La implementación usa eficiencia plana: `P_ac = P_dc_loss × η_inv`, con clipping a `P_ac_nameplate`.

**Lo que define la spec (NREL/TP-6A20-62641, Eq. 8–11):**

```
ζ = P_dc / P_dc0                              (factor de carga)
η = (η_nom / η_ref) × [−0.0162ζ − 0.0059/ζ + 0.9858]

P_ac =
  η × P_dc_loss     si P_dc_loss < P_dc0
  P_ac_nameplate    si P_dc_loss ≥ P_dc0
  0                 si P_dc_loss = 0

P_dc0 = P_ac_nameplate / η_nom
η_ref = 0.9637  (inversor CEC de referencia post-2010)
```

**Impacto práctico:** La curva real tiene menor eficiencia a baja carga (mañana/tarde/días nublados) y máxima eficiencia alrededor del 50-75% de carga. La eficiencia plana sobreestima producción en condiciones de baja irradiancia.

**Preguntas abiertas para Perplexity:**
- ¿Cuál es el error típico en producción anual si se usa eficiencia plana vs. curva PVWatts V5? ¿Es relevante para un TFG o es despreciable (<1%)?
- ¿La curva PVWatts V5 sigue siendo el estándar de la industria en 2025 o hay modelos más actualizados (e.g., Sandia Grid-Connected PV Inverter model)?
- Proporcionar pseudocódigo TypeScript para implementar la curva correctamente con los casos borde (ζ → 0, ζ > 1)

---

### Gap 4 — Integración horaria de precios ENTSO-E en producción (calculations §5.1)

**Estado actual:** ENTSO-E devuelve un precio medio diario (único escalar en €/kWh). Este precio se usa como referencia estática del proyecto. No hay integración horaria precio × producción.

**Lo que define la spec:**

```
Ahorro_h = P_ac_h (Wh) × PrecioPool_h (€/MWh) × 0.001

Ahorro_periodo = Σ Ahorro_h   para h en el periodo
```

Para implementar esto habría que:
1. Ampliar `entsoe.service.ts` para retornar un array de 24 precios horarios (ya los devuelve la API, actualmente se promedian)
2. Asociar cada `IProductionPoint { dateTime, pv }` con el precio de esa hora
3. Calcular y almacenar el ahorro horario real (o calcularlo bajo demanda desde los puntos almacenados)

**Preguntas abiertas para Perplexity:**
- ¿Los precios day-ahead de ENTSO-E tienen suficiente granularidad horaria para los 10 países soportados? ¿Hay países donde solo hay precios de bloque (no horarios)?
- ¿Es más útil para el usuario final ver el ahorro horario acumulado o el "valor de venta" de cada hora de producción? ¿Tiene sentido combinar los IProductionPoint con precio horario en el modelo de datos?
- ¿El precio day-ahead es la métrica correcta para estimar ahorro en autoconsumo residencial, o debería usarse el precio de la tarifa regulada (PVPC en España)?

---

### Gap 5 — Corrección angular de transmitancia (τcover) (calculations §1.2)

**Estado actual:** No implementada. El cálculo usa GTI de Open-Meteo directamente como irradiancia efectiva. Open-Meteo ya aplica la transposición geométrica (tilt/azimuth) pero no la reflexión del cristal del módulo a ángulos oblicuos.

**Lo que define la spec (DeSoto et al. 2006, via PVWatts V5):**

```
θ₂ = arcsin(n_air/n_glass × sin(θ₁))     [Ley de Snell, n_glass ≈ 1.526]

τ(θ₁) = 1 − 0.5 × [sin²(θ₂−θ₁)/sin²(θ₂+θ₁) + tan²(θ₂−θ₁)/tan²(θ₂+θ₁)]

I_tr = I_poa × τ(θ₁)    [irradiancia transmitida]
```

Requiere calcular el ángulo de incidencia solar (θ₁) hora a hora a partir de `lat`, `lon`, `dateTime`, `tilt` y `azimuth` del panel.

**Nota sobre impacto:** La corrección es notable en ángulos superiores a 60°–70° (primeras/últimas horas del día y días de invierno). A incidencia normal (θ₁ ≈ 0°), τ ≈ 0.963, lo que ya está absorbido implícitamente en `wattPeak` (medido a STC con incidencia normal).

**Preguntas abiertas para Perplexity:**
- ¿Cuál es el impacto en producción anual de implementar τcover vs. no implementarlo, para latitudes europeas medias (40°–52°N)? ¿Qué dice el manual de PVWatts V5 al respecto?
- ¿Existe alguna librería npm/Node.js de cálculo de posición solar (azimuth, zenith, ángulo de incidencia) que sea compatible con el modelo PVWatts V5 y bien mantenida?
- ¿Es suficiente aplicar la corrección IAM (Incidence Angle Modifier) usando solo la componente beam (DNI) o también difusa?

### Gap 6 — Catálogo de paneles (seed desde CEC/PVPMC)

**Estado actual:** La colección `Panels` en MongoDB está vacía. El modelo soporta todos los campos del catálogo CEC, pero no hay ningún script de seed ni datos cargados. La aplicación funciona pero el usuario no puede seleccionar ningún panel al crear un proyecto.

**Qué es el catálogo CEC:**
- California Energy Commission Module Database, mantenido por NREL/SAM
- ~17.000 módulos certificados con todos los parámetros eléctricos y térmicos
- Descargable como CSV desde: `https://sam.nrel.gov/photovoltaic/pv-sub-page-2.html` (archivo `CEC Modules`)
- Es el estándar de la industria usado por PVsyst, SAM y PVWatts

**Mapeo de campos CEC → modelo `IPanel`:**

| Campo CSV CEC | Campo `IPanel` | Notas |
|---------------|----------------|-------|
| `Nameplate_Pmax` | `wattPeak` | W pico a STC |
| `I_sc_ref` | `stcIsc` | A |
| `V_oc_ref` | `stcVoc` | V |
| `I_mp_ref` | `stcImp` | A |
| `V_mp_ref` | `stcVmp` | V |
| `T_PmaxC` | `gammaPmp` | %/°C (ya en signo negativo) |
| `NOCT` | `noct` | °C |
| `Bifacial` | `bifacial` | 0/1 → boolean |
| `Bifaciality` | `bifacialityFactor` | [0–1] |
| `PVModTech_name` | `type` | `'Mono-c-Si'` → `'monocrystalline'` etc. |
| `Manufacturer` | `brand` | |
| `Model` | `model` | |

**Qué implementar:**
1. Script `server/src/scripts/seed-panels.ts` que lea el CSV de CEC y haga upsert por `(brand, model)`
2. Para el TFG: filtrar un subconjunto representativo (~30–50 paneles):
   - Varios fabricantes conocidos (Jinko, LONGi, REC, Sunpower, Q-CELLS)
   - Tecnologías distintas: mono-Si, poli-Si, bifacial, HJT
   - Rango de potencias: 300 Wp, 400 Wp, 500 Wp, 600 Wp
3. La arquitectura soporta importar el catálogo completo sin cambios en el modelo

**Preguntas abiertas para Perplexity:**
- ¿Cuál es la forma más fiable de acceder al CSV del catálogo CEC en 2025? ¿Existe algún endpoint de API de SAM o NREL que devuelva los datos directamente sin descarga manual?
- ¿Hay algún repositorio npm o dataset en formato JSON del catálogo CEC ya procesado y listo para importar?
- ¿Qué criterios recomienda la literatura para seleccionar un subset representativo de paneles para un TFG (rango de eficiencias, tecnologías, etc.)?

---

### Gap 7 — Modelo bifacial en el cálculo de producción

**Estado actual:** `bifacialityFactor` existe en `IPanel` y en `PANEL_DEFAULTS` (valor 0), pero `production.service.ts` lo ignora completamente. Todos los proyectos con paneles bifaciales se calculan como si fueran monofaciales.

**Modelo a implementar (simplificado, nivel TFG):**

La ganancia bifacial proviene de la irradiancia que llega a la cara trasera del panel, principalmente luz reflejada por el suelo (albedo).

```
G_rear = albedo × GHI × F_view

F_view = (1 − cos(tilt)) / 2    [factor de visión isótropo cara trasera → suelo]

G_eff = GTI_front + bifacialityFactor × G_rear
```

El `G_eff` sustituye a `GTI` en el paso 4 del pipeline actual (`P_array_dc = P_dc_per_panel × (G_eff/1000) × panelNumber`).

**Valores de albedo por tipo de suelo:**

| Superficie | Albedo |
|-----------|--------|
| Hierba/pradera (default) | 0.20 |
| Asfalto/gravilla | 0.15 |
| Hormigón / cubierta gris | 0.25 |
| Membrana blanca (cubierta) | 0.50 |
| Nieve fresca | 0.80 |
| Tierra agrícola | 0.15–0.25 |

**Cambios necesarios en el código:**

1. **`openmeteo.service.ts`** — añadir `shortwave_radiation` (GHI) a las variables solicitadas:
   ```
   // Actual:
   hourly: 'global_tilted_irradiance,temperature_2m,wind_speed_10m'
   // Con bifacial:
   hourly: 'global_tilted_irradiance,shortwave_radiation,temperature_2m,wind_speed_10m'
   ```

2. **`openmeteo.service.ts`** — incluir `ghi: number` en el tipo `WeatherPoint` y en el mapeo de respuesta.

3. **`projects.model.ts`** — añadir campo `albedo?: number` (default 0.20) a nivel de proyecto.

4. **`production.service.ts` — `calculateHourlyOutputKwh()`** — añadir parámetros `ghi`, `bifacialityFactor`, `albedo`, `tilt`:
   ```typescript
   const fView = (1 - Math.cos((tilt * Math.PI) / 180)) / 2;
   const gRear = albedo * ghi * fView;
   const gEff = bifacialityFactor > 0 ? gti + bifacialityFactor * gRear : gti;
   // usar gEff en lugar de gti en el paso 4
   ```

5. **`ProjectProductionParams`** — añadir `albedo?: number` y `tilt` (ya existe).

**Limitaciones del modelo simplificado:**
- No modela el sombreado entre filas sobre la cara trasera (requiere geometría: pitch, altura de montaje)
- El factor de visión isótropo sobreestima `G_rear` en instalaciones en cubierta con obstáculos laterales
- No distingue entre componente difusa y directa en la cara trasera

**Preguntas abiertas para Perplexity:**
- ¿El modelo isótropo `G_rear = albedo × GHI × (1−cos(tilt))/2` es el estándar mínimo aceptable citado en publicaciones, o hay un modelo de 2 parámetros más preciso con fuente citable (IEC 60904-1-2, NREL)?
- ¿Existe validación del error que introduce este modelo simplificado vs. el modelo bifacial completo de PVsyst?
- ¿Debería el campo `albedo` estar en `Project` (contextual al emplazamiento) o en `Panel` (característica del módulo)? ¿Qué hace PVGIS cuando se llama con paneles bifaciales?
- ¿Qué ganancia bifacial anual típica (en %) cabe esperar en una instalación residencial en tejado con inclinación 30° y albedo 0.25, según estudios recientes (2022–2025)?

---

## 3. Fuera de scope (documentado para claridad)

Los siguientes elementos fueron mencionados en las specs pero se han descartado conscientemente:

| Elemento | Razón |
|----------|-------|
| REE (Red Eléctrica de España) | ENTSO-E cubre España vía EIC `10YES-REE------0`. La API de REE es redundante para el MVP. |
| Modelo Perez 1990 para difusa | No necesario porque Open-Meteo proporciona GTI directamente (transposición ya hecha). |
| Estrategia de batería | No está en el alcance del TFG. |
| Modelos de degradación no lineales | Se usa la aproximación lineal simple de PVWatts V5. |

---

## 4. Variables de entorno

| Variable | Estado |
|----------|--------|
| `ENTSOE_API_KEY` | Requerida. Sin ella, precio de electricidad no se obtiene pero el resto funciona. |
| `PRODUCTION_REFRESH_THRESHOLD_H` | Requerida en prod. Default de cálculo: 6h. |
| `PRODUCTION_HISTORY_DAYS` | Requerida en prod. Default: 7. |
| `PRODUCTION_FORECAST_DAYS` | Requerida en prod. Default: 10. |
| Open-Meteo API key | No requerida (API gratuita). |
| PVGIS API key | No requerida (API gratuita). |

---

## 5. Resumen ejecutivo de gaps por prioridad

| Gap | Complejidad | Valor para TFG | Desbloqueado por |
|-----|-------------|----------------|------------------|
| **Gap 6** — Seed catálogo CEC (paneles en BD) | Baja | Muy alta — sin paneles la app no es usable | Acceso al CSV de SAM/NREL |
| **Gap 1** — Payback / ROI + `installationCost` | Baja | Alta — métrica de negocio central | Decisión sobre modelo de coste |
| **Gap 3** — Curva inversor PVWatts V5 | Baja | Media — rigor científico citado | Implementación directa |
| **Gap 7** — Modelo bifacial (`G_rear` + albedo) | Media | Media — soporte a paneles bifaciales del catálogo CEC | Gap 6 (necesita paneles bifaciales en BD) |
| **Gap 2** — `shadingStatic` automático desde PVGIS | Media | Media — mejora precisión | Decisión sobre usar `usehorizon` |
| **Gap 4** — Ahorro horario con precios ENTSO-E | Alta | Media — storytelling económico | Decisión sobre modelo de datos |
| **Gap 5** — τcover Fresnel/Snell | Alta | Baja — GTI de Open-Meteo lo compensa parcialmente | Librería de posición solar |
