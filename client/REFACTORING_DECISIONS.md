# Refactoring Decisions — Configure-Project God Component

## 1. El problema: el antipatrón "God Component"

Un *God Component* (también llamado *Blob Component* o *Large Class*) es aquel que acumula demasiadas responsabilidades en una sola unidad. Fowler lo describe como una *Large Class* en su catálogo de *code smells* — "a class that is trying to do too much" — y señala que dificulta la comprensión, el mantenimiento y el testing [[1]](#referencias).

En el contexto de frontend, el término se popularizó junto al auge de los frameworks de componentes. El síntoma central es siempre el mismo: el componente conoce demasiadas cosas (servicios, datos, lógica de UI, lógica de negocio, gestión de rutas) y es imposible probar cualquiera de ellas de forma aislada.

El componente `configure-project` antes de esta refactorización presentaba exactamente ese síntoma:

- **835 líneas de TypeScript**, 946 de HTML, 935 de SCSS.
- Dos pantallas funcionalmente distintas (vista y configuración) bajo la misma clase, determinadas en runtime mediante una señal `mode: 'configure' | 'view'`.
- 10 servicios inyectados, más de 20 señales de estado, más de 20 valores derivados y 4 configuraciones de gráficos Highcharts.
- Llamadas HTTP directas al servicio externo Nominatim desde el propio componente.

---

## 2. Principio de Responsabilidad Única (SRP)

El SRP, primer principio SOLID, establece que una clase debe tener una única razón para cambiar [[2]](#referencias). Aplicado a componentes de frontend, significa que un componente debe encargarse de una sola preocupación de UI: mostrar datos, o editarlos, pero no ambas cosas simultáneamente controladas por una flag de modo en runtime.

La separación en `ProjectViewComponent` y `ConfigureProjectComponent` aplica directamente este principio:

| Componente | Razón para cambiar |
|---|---|
| `ProjectViewComponent` | Cambia el diseño de la pantalla de visualización (gráficos, métricas, sun path) |
| `ConfigureProjectComponent` | Cambia el flujo del stepper de configuración o el formulario de edición |

Antes de la refactorización, ambas razones de cambio recaían sobre el mismo fichero, lo que convertía cada PR en un candidato a introducir regresiones en la parte no tocada.

---

## 3. Patrón Container/Presenter (Smart/Dumb Components)

El patrón fue formalizado por Dan Abramov en 2015 para React [[3]](#referencias) y es hoy un estándar de la industria en todos los frameworks de componentes (React, Vue, Angular, Svelte). Su principio central es:

- **Container (Smart):** posee estado, inyecta servicios, orquesta la lógica. Difícil de probar en aislamiento porque depende de la infraestructura.
- **Presenter (Dumb):** recibe datos vía `@Input` / `input()` y emite eventos vía `@Output` / `output()`. No conoce servicios. Trivialmente testable con solo proporcionar inputs.

La Angular Style Guide oficial recomienda explícitamente "components that present data with little or no logic" (*presentational components*) y separar la "application logic" en servicios o componentes contenedor [[4]](#referencias).

Esta refactorización aplica el patrón en dos niveles:

### Nivel de ruta (containers)

| Ruta | Container | Responsabilidad |
|---|---|---|
| `/projects/:id` | `ProjectViewComponent` | Carga proyecto + analytics + sun path; genera opciones de gráficos; descarga plan |
| `/projects/:id/configure` | `ConfigureProjectComponent` | Gestiona formulario reactivo; búsqueda de localización; cálculo de configuración óptima; guardado |

### Nivel de stepper (presenters)

| Presenter | Inputs | Outputs |
|---|---|---|
| `ConfigureLocationStepComponent` | `polygonCoords`, `mapLat/Lng`, `isSearching`, `searchError` | `polygonChange`, `addressSearch` |
| `ConfigurePanelFormStepComponent` | `formGroup`, `panelsWithLabel`, `orientationOptions`, `optimalConfig`, … | `applyOptimal` |
| `ConfigureReviewStepComponent` | `formValue`, `locationSummary`, `totalCapacityKw`, `canSave`, … | `goToStep`, `save` |
| `ProjectAnalyticsComponent` | `analytics`, `isLoading`, `currency`, `savingsChartOptions` | — |
| `ProductionChartsComponent` | `todayChartOptions`, `nextProdChartOptions`, `economicValue`, … | — |

Cada presenter puede testearse de forma determinista: se le proporcionan inputs, se verifica el DOM o los outputs emitidos. No hay HTTP que mockear, no hay señales globales que inicializar.

---

## 4. Separación de responsabilidades en servicios (Ley de Demeter)

La *Ley de Demeter* (principio de mínimo conocimiento) establece que un módulo no debe conocer los detalles internos de los objetos con los que interactúa [[5]](#referencias). Inyectar `HttpClient` directamente en un componente viola este principio: el componente pasa a conocer detalles del protocolo HTTP (headers, parámetros de URL, estructura de la respuesta de Nominatim) que no le corresponden.

La extracción de `GeocodingService` aplica el principio de *encapsulación de infraestructura*:

```
Antes:   ConfigureProjectComponent → HttpClient → Nominatim API
Después: ConfigureProjectComponent → GeocodingService → HttpClient → Nominatim API
```

El componente ahora solo sabe que puede buscar una dirección y obtener un `GeocodingResult`. Cómo se obtiene ese resultado (HTTP, caché, mock) es responsabilidad exclusiva del servicio. Esto es coherente con la arquitectura en capas recomendada por Angular (componentes → servicios → HTTP) [[4]](#referencias).

Adicionalmente, las constantes `COUNTRY_CURRENCY` y `COUNTRY_TIMEZONE`, antes hardcodeadas en el componente, se mueven al servicio como estado privado. Esto elimina el acoplamiento entre el componente de UI y los datos de configuración regional.

---

## 5. Testabilidad como objetivo de diseño

La testabilidad no es un subproducto del buen diseño, sino uno de sus objetivos principales. Feathers define en *Working Effectively with Legacy Code* que "code without tests is bad code", y que el primer paso para testar código legado es romper sus dependencias [[6]](#referencias).

Los componentes presenter — sin servicios inyectados — se testean de forma determinista:

```typescript
// Patrón de test para un presenter (ConfigureReviewStepComponent)
fixture.componentRef.setInput('formValue', stubFormValue);
fixture.componentRef.setInput('canSave', true);
fixture.detectChanges();

component.save.subscribe(saveSpy);
btn.triggerEventHandler('onClick', {});
expect(saveSpy).toHaveBeenCalledTimes(1);
```

La extracción de `GeocodingService` también facilita el testing del container: en lugar de interceptar peticiones HTTP al dominio de Nominatim, basta con:

```typescript
const geocodingService = TestBed.inject(GeocodingService);
jest.spyOn(geocodingService, 'search').mockReturnValue(of(stubResult));
```

---

## 6. Lazy loading y rendimiento de carga inicial

Separar `ProjectViewComponent` en su propia ruta lazy-loaded significa que el bundle de Highcharts y todos los imports del stepper de configuración no se cargan al navegar a `/projects/:id`. Solo se descargan cuando el usuario navega a `/projects/:id/configure`. En aplicaciones con muchos usuarios en modo lectura (lo más común), esto reduce el coste de red y el tiempo de parseo de JavaScript en cada visita [[4]](#referencias).

---

## 7. Árbol de ficheros resultante

```
features/user/
  project-view/
    project-view.component.ts / .html / .scss          ← Container (vista)
    components/
      project-analytics/project-analytics.component.ts  ← Presenter
      production-charts/production-charts.component.ts   ← Presenter

  configure-project/
    configure-project.component.ts / .html / .scss      ← Container (edición)
    components/
      configure-location-step/                           ← Presenter
      configure-panel-form-step/                         ← Presenter
      configure-review-step/                             ← Presenter

core/services/
  geocoding.service.ts                                  ← Servicio extraído
```

**Antes:** 1 componente × ~835 TS + ~946 HTML + ~935 SCSS = ~2716 líneas en un solo flujo.  
**Después:** 7 componentes + 1 servicio, cada uno con responsabilidad única y contrato claro.

---

## Referencias

[1] Fowler, M. (2018). *Refactoring: Improving the Design of Existing Code* (2nd ed.). Addison-Wesley. Cap. 3: "Bad Smells in Code" — *Large Class*.

[2] Martin, R. C. (2003). *Agile Software Development, Principles, Patterns, and Practices*. Prentice Hall. Cap. 8: "The Single-Responsibility Principle".

[3] Abramov, D. (2015). *Presentational and Container Components*. Medium / React Blog. https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0

[4] Angular Team. (2024). *Angular Style Guide*. https://angular.dev/style-guide (sections: Component selectors, Delegate complex component logic to services, Small functions).

[5] Lieberherr, K. J., & Holland, I. M. (1989). *Assuring good style for object-oriented programs*. IEEE Software, 6(5), 38–48. (Ley de Demeter original).

[6] Feathers, M. C. (2004). *Working Effectively with Legacy Code*. Prentice Hall. Cap. 1: "Changing Software".
