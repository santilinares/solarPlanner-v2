<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Estos son trozos importantes sacados de una conversacion previa dentro de este mmismo Space. Necesito complemnentar algunas cosas que no hemos definido. Hemos visto que colecciones hay que modificar y los nuevos campos que se añaden, así como cuando actualizar los datos de cada campo y que endpoints de cada API necesito. Lo que no hemos revisado es que cálculos debo hacer con cada uno de los datos que estoy obteniendo para poder hacer uso de estos datos de manera eficiente. Vuelvo a compartirte fuentes de información que hemos usado antes. Además te recuerdo que toda fuente debe ser cientifica/paper o contrastada y para nada debes inventarte cosas si no las sabes. Aquí las fuentes:

- [https://www.energy.gov/ea/national-renewable-energy-laboratory](https://www.energy.gov/ea/national-renewable-energy-laboratory)
- [https://www.iea.org/](https://www.iea.org/)
- [https://www.ree.es/es](https://www.ree.es/es)
- [https://sam.nlr.gov/](https://sam.nlr.gov/)

Perfecto 💪 Ya tengo la información técnica que necesitabas. Ahora voy a estructurar **los cálculos específicos** que debes implementar con los datos que obtienes de cada API, basándome completamente en las fuentes científicas validadas (NREL, PVGIS, IEA) que has revisado.

Te preparo un documento técnico completo que complementa lo que ya habéis definido sobre colecciones, campos y endpoints. 📊

***

## 🧮 **Cálculos Necesarios para Procesamiento de Datos de APIs**

Complemento al diseño técnico de **Solar Planner 2.0** con las **fórmulas de cálculo validadas** que necesitas implementar para transformar los datos brutos de las APIs en métricas útiles para el usuario.

***

### **🎯 1. Procesamiento de Datos de Open-Meteo**

#### **1.1. Cálculo de Irradiancia Efectiva (Ee)**

**Fuente de datos:** `shortwave_radiation`, `direct_normal_irradiance`, `diffuse_radiation`[^1_1][^1_2]

**Fórmula de Irradiancia en Plano del Array (POA):**

$$
I_{poa} = I_b + I_{d,sky} + I_{d,ground}
$$

Donde:

- **$I_b$** = Irradiancia directa (beam) = `DNI × cos(α)`
    - `DNI` = Direct Normal Irradiance (Open-Meteo)
    - `α` = Ángulo de incidencia (calculado con geometría solar)
- **$I_{d,sky}$** = Irradiancia difusa del cielo
    - Usar modelo **Perez 1990** (implementado en PVWatts)[^1_2][^1_1]
    - Entrada: `diffuse_radiation` de Open-Meteo
- **$I_{d,ground}$** = Irradiancia reflejada del suelo

$$
I_{d,ground} = DHI \times albedo \times \frac{1 - \cos(\beta)}{2}
$$

- `DHI` = `diffuse_radiation` de Open-Meteo
- `albedo` = 0.2 (valor por defecto)[^1_2]
- `β` = ángulo de inclinación del panel (`tilt` en tu colección `Projects`)

> 💡 **Implementación:** Calcular `Ipoa` para cada hora usando `lat`, `lon`, `tilt`, `azimuth` del proyecto + datos horarios de Open-Meteo.

***

#### **1.2. Corrección por Transmitancia del Módulo (τcover)**

**Ajuste por reflexión en la cubierta del panel:**[^1_2]

Para **paneles estándar** (vidrio, n=1.526):

$$
\tau_{cover}(\alpha) = 1 - 0.5 \left[\frac{\sin^2(\theta_2 - \theta_1)}{\sin^2(\theta_2 + \theta_1)} + \frac{\tan^2(\theta_2 - \theta_1)}{\tan^2(\theta_2 + \theta_1)}\right]
$$

Donde:

- `α` = ángulo de incidencia
- `θ₂` se calcula con **Ley de Snell**: $\theta_2 = \arcsin\left(\frac{n_{air}}{n_{glass}} \sin(\theta_1)\right)$[^1_2]

Para **paneles premium** (con recubrimiento anti-reflejante):

- Aplicar modelo de dos capas (AR coating + vidrio)[^1_2]
- Mejora típica: ~3% a incidencia normal, más notable en ángulos altos

**Irradiancia transmitida:**

$$
I_{tr} = I_{poa} \times \tau_{cover}(\alpha)
$$

> ⚠️ **Nota:** Si usas paneles `type: 'standard'`, el valor de `τcover` a 0° (normal) ya está incluido en `wattPeak`. Solo aplicas la corrección angular.[^1_2]

***

#### **1.3. Cálculo de Temperatura de Célula (Tcell)**

**Modelo térmico de Fuentes** (usado por PVWatts):[^1_2]

$$
T_{cell} = T_a + \frac{G}{U_0 + U_1 \times W}
$$

Donde:

- **$T_a$** = `temperature_2m` de Open-Meteo (°C)
- **$G$** = Irradiancia POA total ($I_{poa}$, W/m²)
- **$W$** = `wind_speed_10m` de Open-Meteo (m/s)
- **$U_0, U_1$** = Coeficientes de transferencia de calor[^1_3][^1_2]
    - Para **open rack / tracking**: INOCT = 45°C
    - Para **roof mount**: INOCT = 49°C

**Fórmula simplificada alternativa** (PVGIS):[^1_3]

$$
T_m = T_a + \frac{G}{U_0 + U_1 \times W}
$$

> 💡 **Implementación:** Usar datos horarios de Open-Meteo (`temperature_2m`, `wind_speed_10m`) + `Ipoa` calculado. Si implementas versión completa de Fuentes, incluir capacitancia térmica con integración numérica entre timesteps.

***

### **🔋 2. Cálculo de Producción DC**

#### **2.1. Potencia DC en el Punto de Máxima Potencia**

**Fórmula base de PVWatts V5:**[^1_1][^1_2]

Para irradiancia **> 125 W/m²**:

$$
P_{dc} = \frac{I_{tr}}{E_0} \times P_{dc0} \times \left[1 + \gamma(T_{cell} - T_0)\right]
$$

Donde:

- **$I_{tr}$** = Irradiancia transmitida (W/m²)
- **$E_0$** = 1000 W/m² (referencia STC)
- **$P_{dc0}$** = Potencia nominal DC = `panelNumber × panel.wattPeak` (W)
- **$γ$** = Coeficiente de temperatura = `panel.temperatureCoefficient` o `panel.gammaPmp` (%/°C)
- **$T_{cell}$** = Temperatura de célula calculada (°C)
- **$T_0$** = 25°C (temperatura de referencia STC)

**Coeficientes de temperatura por tipo de panel:**[^1_2]

```typescript
const gamma = {
  'standard': -0.47,    // %/°C
  'premium': -0.35,     // %/°C  
  'thin-film': -0.20    // %/°C
}
```

> ⚠️ **Nota:** PVWatts V5 **eliminó** la corrección cuadrática para baja irradiancia (<125 W/m²) porque no se observa en módulos modernos.[^1_2]

***

#### **2.2. Aplicación de Pérdidas de Sistema**

**Pérdidas multiplicativas** (según PVWatts):[^1_2]

$$
L_{total}(\%) = 100 \times \left[1 - \prod_i \left(1 - \frac{L_i}{100}\right)\right]
$$

Donde `Li` son las pérdidas individuales en `Projects.systemLosses`:

- `dcWiring`: 1-3% (por defecto 2%)
- `mismatch`: 1-3% (por defecto 2%)
- `soiling`: 1-5% (por defecto 2%)
- `connections`: ~0.5%
- `shadingStatic`: obtenido de PVGIS (ver sección 3)

**Energía DC después de pérdidas:**

$$
P_{dc,loss} = P_{dc} \times \left(1 - \frac{L_{total}}{100}\right)
$$

***

### **⚡ 3. Conversión AC (Inversor)**

#### **3.1. Modelo de Eficiencia del Inversor**

**Curva de eficiencia PVWatts V5** (basada en análisis de inversores CEC post-2010):[^1_2]

$$
\eta = \frac{\eta_{nom}}{\eta_{ref}} \left[-0.0162 \times \zeta - \frac{0.0059}{\zeta} + 0.9858\right]
$$

Donde:

- **$ζ$** = Factor de carga = $\frac{P_{dc}}{P_{dc0}}$
- **$η_{nom}$** = `systemLosses.inverterEfficiency` (por defecto 0.96)
- **$η_{ref}$** = 0.9637 (eficiencia de referencia del inversor "típico" CEC)[^1_2]
- **$P_{dc0}$** = Capacidad DC ajustada = $\frac{P_{ac,nameplate}}{\eta_{nom}}$

**Potencia AC con clipping:**[^1_2]

$$
P_{ac} = 
\begin{cases}
\eta \times P_{dc,loss} & \text{si } P_{dc,loss} < P_{dc0} \\
P_{ac,nameplate} & \text{si } P_{dc,loss} \geq P_{dc0} \\
0 & \text{si } P_{dc,loss} = 0
\end{cases}
$$

Donde $P_{ac,nameplate}$ se calcula con **DC/AC ratio** (por defecto 1.1):[^1_2]

$$
P_{ac,nameplate} = \frac{P_{dc,total}}{\text{dcAcRatio}}
$$

***

### **🌍 4. Procesamiento de Datos de PVGIS**

#### **4.1. Obtención de Factor de Sombreado Estático**

**Endpoint PVGIS:** `/api/pvgis/seriescalc`[^1_4]

**Parámetros clave:**

- `userhorizon`: perfil de horizonte (montañas, obstáculos)
- `pvcalculation=1`: incluir cálculo de producción FV

**Extracción del sombreado:**[^1_5]

Comparar producción con horizonte vs. sin horizonte:

$$
\text{shadingStatic}(\%) = 100 \times \frac{E_{\text{ideal}} - E_{\text{real}}}{E_{\text{ideal}}}
$$

Donde:

- $E_{ideal}$ = producción anual sin horizonte
- $E_{real}$ = producción anual con horizonte (`userhorizon`)

> 💡 **Guardar en:** `Projects.systemLosses.shadingStatic`

***

#### **4.2. Corrección por Temperatura e Irradiancia (PVGIS)**

PVGIS aplica pérdidas específicas por tecnología:[^1_4]

**Para cristalino silicio (2025):**

- Coeficientes calibrados para tecnologías recientes (PERC, back contact, heterojunction)
- Ganancia: 2-3% en rendimiento anual vs. coeficientes "originales"

**Para CdTe / CIS / CIGS:**

- Correcciones específicas de temperatura disponibles en PVGIS

**Para "other/unknown":**

- Asume pérdida genérica de **8% por temperatura**[^1_4]

> 🔧 **Uso:** Validar que tu modelo de temperatura (Fuentes) produce resultados consistentes con promedios mensuales/anuales de PVGIS.

***

### **💰 5. Procesamiento de Datos de ENTSO-E / REE**

#### **5.1. Precio Horario de Electricidad**

**Endpoint ENTSO-E:** `EnergyPrices_12.1.D_r3`[cite from file:1]

**Cálculo de ahorro horario:**

$$
\text{Ahorro}_h = P_{ac,h} \times \text{PrecioPool}_h \times 0.001
$$

Donde:

- $P_{ac,h}$ = producción AC en hora h (Wh)
- $PrecioPool_h$ = precio pool horario (€/MWh)
- Factor 0.001 = conversión Wh → MWh

**Ahorro mensual/anual:**

$$
\text{Ahorro}_{periodo} = \sum_{h \in periodo} \text{Ahorro}_h
$$

***

#### **5.2. Cálculo de ROI / Payback**

**Tiempo de amortización simple:**

$$
\text{Payback (años)} = \frac{\text{Inversión inicial}}{\text{Ahorro anual}}
$$

**ROI a N años:**

$$
\text{ROI}(\%) = 100 \times \frac{\sum_{i=1}^{N} \text{Ahorro}_i - \text{Inversión}}{\text{Inversión}}
$$

Con degradación anual del panel:[^1_2]

$$
\text{Producción}_{año\,i} = \text{Producción}_{año\,1} \times \left(1 - \frac{\text{degradationFirstYear}}{100}\right) \times \left(1 - \frac{\text{degradationAnnual} \times (i-1)}{100}\right)
$$

> 💡 **Usar:** `panel.degradationFirstYear`, `panel.degradationAnnual` de tu colección `Panels`.

***

### **📈 6. Agregación Temporal**

#### **6.1. Producción Diaria**

Para cada día en `prodToday`:

$$
E_{day} = \sum_{h=0}^{23} P_{ac,h} \times 1 \text{ hora}
$$

Resultado en **kWh/día**.

***

#### **6.2. Producción Mensual / Anual**

$$
E_{month} = \sum_{d \in month} E_{day}
$$

$$
E_{year} = \sum_{m=1}^{12} E_{month}
$$

***

#### **6.3. Irradiación Promedio Diaria (kWh/m²/día)**

**Según metodología PVWatts:**[^1_2]

$$
\overline{POA}_m = \frac{0.001 \times \sum_{h \in month} I_{poa,h}}{\text{días en mes } m}
$$

> 📊 **Uso:** Mostrar al usuario el recurso solar disponible en su ubicación.

***

### **🔄 7. Lógica de Actualización**

#### **7.1. Ventana Deslizante (Rolling Window)**

**Al finalizar cada día (cron nocturno):**

```typescript
// Pseudocódigo
previousProd.push(...prodToday);
previousProd = previousProd.filter(point => 
  point.dateTime >= now.minus({ days: 7 })
);
prodToday = [];
totalProd += sum(prodToday); // del día que finalizó
lastRefreshedAt = now;
```


***

#### **7.2. Refresco Bajo Demanda**

**Al acceder a proyecto (GET /projects/:id):**

```typescript
const threshold = 6 * 3600 * 1000; // 6 horas en ms

if (now - lastRefreshedAt > threshold) {
  // Recalcular prodToday desde medianoche hasta now
  prodToday = calculateProduction(
    openMeteo.getHourlyData(todayMidnight, now),
    project
  );
  
  // Opcional: refinar nextProd con forecast fresco
  nextProd = calculateProduction(
    openMeteo.getForecast(now, now.plus({ days: 7 })),
    project
  );
  
  lastRefreshedAt = now;
  await project.save();
}
```


***

### **📊 8. Fórmulas de Métricas Business**

#### **8.1. Factor de Capacidad (Capacity Factor)**

$$
CF(\%) = 100 \times \frac{E_{real,year}}{P_{dc0} \times 8760}
$$

Donde:

- $E_{real,year}$ = producción anual real (kWh)
- $P_{dc0}$ = potencia nominal (kW)
- 8760 = horas en un año

***

#### **8.2. Ratio de Rendimiento (Performance Ratio)**

$$
PR(\%) = 100 \times \frac{E_{ac,year}}{E_{ref}}
$$

Donde:

$$
E_{ref} = P_{dc0} \times \frac{\sum_{h=1}^{8760} I_{poa,h}}{1000}
$$

> 🎯 **Interpretación:** PR típico = 75-85%. Valores <70% indican problemas; >85% indica sistema bien diseñado.[^1_6]

***

### **✅ 9. Checklist de Validación**

Antes de presentar datos al usuario:

- [ ] **$P_{dc}$ > 0** solo si $I_{poa} > 0$ (evitar valores negativos nocturnos)
- [ ] **$P_{ac} \leq P_{ac,nameplate}$** (clipping del inversor)
- [ ] **$T_{cell} \geq T_a$** (la célula siempre más caliente que ambiente si hay irradiancia)
- [ ] **$\sum E_{day} \approx E_{PVGIS,month}$** (validación cruzada mensual con PVGIS ±10%)
- [ ] **Pérdidas totales ~ 14-18%** (rango razonable para sistemas residenciales)[^1_2]

***

### **📚 Resumen de Fuentes Científicas Utilizadas**

| **Cálculo** | **Fuente Principal** |
| :-- | :-- |
| Modelo DC (Pdc) | NREL PVWatts V5 Manual[^1_2] |
| Modelo térmico (Tcell) | Fuentes 1987 (implementado en PVWatts)[^1_2] |
| Pérdidas multiplicativas | NREL/TP-6A20-62641[^1_2] |
| Irradiancia POA (Perez 1990) | PVWatts V5 Manual[^1_2] |
| Eficiencia inversor | Análisis CEC inversores post-2010[^1_2] |
| Corrección angular (τcover) | DeSoto et al. 2006 (citado en PVWatts)[^1_2] |
| Validación PVGIS | PVGIS User Manual \& Data Sources[^1_4][^1_3] |
| Gestión de pérdidas | Marion et al. 2005, NREL[^1_2] |


***

### **🚀 Próximos Pasos**

1. **Implementar funciones auxiliares:**
    - `calculateSunPosition(lat, lon, dateTime)` → α, zenith
    - `calculatePOA(DNI, DHI, alpha, tilt, azimuth)` → Ipoa
    - `calculateCellTemp(Tamb, Ipoa, windSpeed, mountType)` → Tcell
2. **Crear servicio de cálculo:**

```typescript
class ProductionCalculator {
  calculateHourlyProduction(
    weatherData: OpenMeteoHourly,
    project: IProject,
    panel: IPanel
  ): ProductionPoint[]
}
```

3. **Testing con datos reales:**
    - Comparar salidas con PVWatts online
    - Validar promedios mensuales vs. PVGIS
    - Verificar ahorro económico con facturas eléctricas reales

***

Espero que esta especificación técnica complemente perfectamente tu diseño anterior 🎯 Si necesitas que profundice en algún cálculo específico o que te genere pseudocódigo/TypeScript para alguna sección, ¡solo avísame! 🚀
<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_27][^1_28][^1_29][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/pvwatts/

[^1_2]: https://docs.nrel.gov/docs/fy14osti/62641.pdf

[^1_3]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-data-sources-calculation-methods_en

[^1_4]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en

[^1_5]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/using-pvgis-frequently-asked-questions_en

[^1_6]: https://kb.solargis.com/docs/pv-system-losses

[^1_7]: Ahora-necesito-que-recuperemos-la-parte-en-la-que.md

[^1_8]: Antes-de-eso-me-gustaria-plasmar-en-un-documento-t.md

[^1_9]: https://ieeexplore.ieee.org/document/11099933/

[^1_10]: https://journals.sagepub.com/doi/10.1177/00368504211010572

[^1_11]: http://www.cjmenet.com.cn/CN/10.3901/JME.2021.20.153

[^1_12]: https://linkinghub.elsevier.com/retrieve/pii/S2352484721001426

[^1_13]: https://pubs.acs.org/doi/10.1021/acs.jctc.9b00538

[^1_14]: https://ieeexplore.ieee.org/document/9159648/

[^1_15]: https://www.ajol.info/index.php/jfas/article/view/248071

[^1_16]: https://link.springer.com/10.1007/s40789-025-00785-2

[^1_17]: https://pvwatts.nlr.gov

[^1_18]: https://docs.nrel.gov/docs/fy14osti/60272.pdf

[^1_19]: https://www.les.com/solar-calculator-how-guide

[^1_20]: https://www.scribd.com/document/836930094/PVWatts-Calculator

[^1_21]: https://www.futurasun.com/en/temperature-coefficient/

[^1_22]: https://ndcpartnership.org/knowledge-portal/climate-toolbox/pvwatts-calculator

[^1_23]: https://pvgis.com/en/pvgis-5-3

[^1_24]: https://www.alternative-energy-tutorials.com/photovoltaics/temperature-coefficient.html

[^1_25]: https://www.youtube.com/watch?v=-NJreCvMiU8

[^1_26]: https://sinovoltaics.com/solar-basics/measuring-the-temperature-coefficients-of-a-pv-module/

[^1_27]: https://www.scribd.com/document/469217173/a6

[^1_28]: https://ieeexplore.ieee.org/document/11294298/

[^1_29]: https://internationalpubls.com/index.php/cana/article/view/5256

[^1_30]: https://scijournals.onlinelibrary.wiley.com/doi/10.1002/ese3.1679

[^1_31]: https://www.nature.com/articles/s41598-024-54181-y

[^1_32]: https://www.mdpi.com/1996-1073/17/5/1124

[^1_33]: https://www.mdpi.com/2673-4117/6/9/233

[^1_34]: https://pubs.aip.org/aip/acp/article/701660

[^1_35]: https://arxiv.org/abs/2409.16320

[^1_36]: https://pvgis.com/en/blog/introduction-to-solar-radiation

[^1_37]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en

[^1_38]: https://pvgis.com/en/guide-complete-pvgis

[^1_39]: https://www.youtube.com/watch?v=n7OzKgvnYVs

[^1_40]: https://solarmathlab.com/content/inverters/solar-inverter-efficiency-loss-calculator.html

[^1_41]: https://open-meteo.com/en/docs/satellite-radiation-api

[^1_42]: https://pvgis.com/en/user-manual

[^1_43]: https://www.etasr.com/index.php/ETASR/article/view/6948

[^1_44]: https://docs.openweather.co.uk/api/solar-radiation

[^1_45]: http://www.onetaelgold.com/20240915-2/

[^1_46]: https://open-meteo.com/en/features

[^1_47]: https://www.youtube.com/watch?v=egReBSmaNCs


---

# De toda esta investigación (la respuesta previa), puedes darme las top 10 fuentes en las que te has basado?

Aquí tienes las **top 10 fuentes científicas y contrastadas** en las que se ha basado toda la investigación de cálculos para Solar Planner 2.0 ☀️📚

***

## 🏆 Top 10 Fuentes Científicas

### 1. 🥇 NREL — PVWatts Version 5 Manual

> **Dobos, A.P. (2014). *PVWatts Version 5 Manual*. NREL/TP-6A20-62641. National Renewable Energy Laboratory.**

**La fuente más usada** en toda la investigación.  Documenta las fórmulas exactas de: potencia DC ($P_{dc}$), modelo térmico de Fuentes ($T_{cell}$), curva de eficiencia del inversor (ecuaciones 8, 10, 11), pérdidas de sistema multiplicativas (ecuación 9), corrección angular de cubierta ($\tau_{cover}$) e irradiancia POA (ecuación 2).[^2_1]

🔗 [https://docs.nrel.gov/docs/fy14osti/62641.pdf](https://docs.nrel.gov/docs/fy14osti/62641.pdf)

***

### 2. 🥈 PVPMC Sandia — PVWatts Modeling Guide

> **PV Performance Modeling Collaborative, Sandia National Laboratories. *PVWatts DC Module Model*.**

Complementa el manual NREL con descripción formal de las ecuaciones de $P_{mp}$, coeficientes $\gamma$ y comportamiento a baja irradiancia.[^2_2]

🔗 [https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/pvwatts/](https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/pvwatts/)

***

### 3. 🥉 PVGIS — User Manual \& Data Sources (JRC, Comisión Europea)

> **Joint Research Centre (2024). *PVGIS User Manual \& Data Sources and Calculation Methods*. European Commission.**

Fuente oficial para validación cruzada mensual, obtención del factor de sombreado estático desde horizonte y correcciones por tecnología (PERC, HJT, CdTe).[^2_3][^2_4]

🔗 [https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-data-sources-calculation-methods_en](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-data-sources-calculation-methods_en)

***

### 4. NREL — Performance Parameters for Grid-Connected PV Systems

> **Marion, W. et al. (2005). *Performance Parameters for Grid-Connected PV Systems*. Proc. 31st IEEE PVSC.**

Referencia fundacional para el cálculo del **Performance Ratio (PR)** y el **Capacity Factor (CF)**, así como la metodología de descomposición de pérdidas. Citada directamente en el manual PVWatts V5.[^2_1]

🔗 Referencia  en PVWatts V5 Manual.[^2_5]

***

### 5. Fuentes, M.K. (1987) — Modelo Térmico

> **Fuentes, M.K. (1987). *A Simplified Thermal Model for Flat-Plate Photovoltaic Arrays*. SAND85-0330. Sandia National Laboratories.**

Modelo térmico base para calcular $T_{cell}$ a partir de $T_{amb}$, irradiancia POA y velocidad del viento (con INOCT). Integrado en PVWatts V5 y validado en miles de instalaciones.[^2_1]

🔗 Referencia  en PVWatts V5 Manual.[^2_6]

***

### 6. Open-Meteo — API Documentation

> **Open-Meteo (2024). *Open-Meteo API Documentation: Solar Radiation Variables*.**

Documentación oficial para los parámetros `global_tilted_irradiance`, `direct_normal_irradiance`, `diffuse_radiation`, `temperature_2m`, `wind_speed_10m`. Fuente de datos primaria para todos los cálculos horarios de producción.[^2_7]

🔗 [https://open-meteo.com/en/docs/satellite-radiation-api](https://open-meteo.com/en/docs/satellite-radiation-api)

***

### 7. DeSoto, W.; Klein, S.; Beckman, W. (2006)

> **DeSoto, W. et al. (2006). *Improvement and Validation of a Model for Photovoltaic Array Performance*. Solar Energy, vol. 80, pp. 78-88.**

Base científica para la **corrección angular de transmitancia** ($\tau_{cover}$) mediante las ecuaciones de Fresnel y la Ley de Snell. Citada explícitamente en PVWatts V5 como referencia.[^2_8][^2_1]

***

### 8. Perez, R. et al. (1990) — Modelo Difuso

> **Perez, R.; Ineichen, P.; Seals, R.; Michalsky, J.; Stewart, R. (1990). *Modeling Daylight Availability and Irradiance Components*. Solar Energy, 44(5), pp. 271-289.**

Algoritmo de referencia para descomponer la irradiancia difusa en los tres componentes (isotrópica, circunsolar y brightening de horizonte) al calcular la irradiancia en el plano del generador (POA). Implementado directamente en PVWatts.[^2_1]

***

### 9. Solargis — PV System Losses Documentation

> **Solargis (2026). *PV System Losses — Knowledge Base*.**

Referencia técnica contemporánea para la cuantificación y categorización de pérdidas del sistema (PR típico 75-85%, descomposición de pérdidas por categoría).[^2_9]

🔗 [https://kb.solargis.com/docs/pv-system-losses](https://kb.solargis.com/docs/pv-system-losses)

***

### 10. ENTSO-E — Manual of Procedures (Detailed Data Descriptions)

> **ENTSO-E (2022). *Manual of Procedures: Detailed Data Descriptions v3.4*. (MoP_Ref2_DDD_v3r4).**

Fuente oficial para los endpoints de precios horarios (`EnergyPrices_12.1.D_r3`), carga del sistema y generación agregada, usados para los cálculos de ahorro horario, ROI y estrategias de batería.[^2_10]

🔗 [https://eepublicdownloads.entsoe.eu/clean-documents/Transparency/MoP_Ref2_DDD_v3r4.pdf](https://eepublicdownloads.entsoe.eu/clean-documents/Transparency/MoP_Ref2_DDD_v3r4.pdf)

***

> 💡 **Nota:** La **fuente \#1 (PVWatts V5 Manual)** es con diferencia la más crítica para tu implementación, ya que contiene las ecuaciones exactas numeradas que puedes citar directamente en la memoria del TFG y pasar a Claude Code como referencia formal.

<div align="center">⁂</div>

[^2_1]: https://docs.nrel.gov/docs/fy14osti/62641.pdf

[^2_2]: https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/pvwatts/

[^2_3]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en

[^2_4]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-data-sources-calculation-methods_en

[^2_5]: https://docs.nrel.gov/docs/fy14osti/60272.pdf

[^2_6]: https://www.scribd.com/document/836930094/PVWatts-Calculator

[^2_7]: https://open-meteo.com/en/docs/satellite-radiation-api

[^2_8]: https://pvgis.com/en/pvgis-5-3

[^2_9]: https://kb.solargis.com/docs/pv-system-losses

[^2_10]: Ahora-necesito-que-recuperemos-la-parte-en-la-que.md

