# Reporte de auditoria tecnica

## Hallazgos, detalle y soluciones propuestas

| Hallazgo | Detalle tecnico | Solucion propuesta |
|---|---|---|
| Modulo CAPEX faltante (`../data/capex-benchmarks-eu`) | Backend importa un archivo que no existe en `server/src/data`, por eso fallan build y parte de tests. | 1. Restaurar/crear `server/src/data/capex-benchmarks-eu.ts` con `CAPEX_BENCHMARKS_EU`, `DEFAULT_CAPEX_COUNTRY`, `CapexSegment`. 2. Validar nombres de export usados por servicios. |
| `TS2345` en `estimateProject` + `asyncHandler` | `asyncHandler` espera una funcion async (Promise) y ese handler devuelve `Response` directo sin `await`. | Convertir el handler a async real o ajustar `asyncHandler` para admitir sync+async (mejor mantener contrato async uniforme). |
| 18 errores ESLint backend (`no-unsafe-*`, `require-await`) | Tipado incompleto en servicios CAPEX/proyectos y funcion async sin await real. | Tipar CAPEX con interfaces/records explicitos, eliminar `any` implicitos, y corregir `require-await` segun el punto anterior. |
| 5 warnings backend `no-explicit-any` | Utilidades usan `any` en logger/response/asyncHandler. | Reemplazar por `unknown` + narrowing o genericos (`Response<T>`), sobre todo en helpers de respuesta. |
| Vitest falla en `dist/__tests__/*.js` (CommonJS) | Vitest descubre tests compilados en `dist` ademas de `src`; los `.js` CJS chocan con `vitest`. | En `server/vitest.config.ts` agregar `test.exclude: ['dist/**','node_modules/**']` y/o `test.include` solo a `src/__tests__/**/*.test.ts`. |
| Incoherencia en config Vitest | `dist/` se excluye solo en `coverage.exclude`, no en ejecucion de tests. | Mover exclusion al bloque `test` (descubrimiento), no solo a cobertura. |
| Test `project.service.test.ts` falla por CAPEX faltante | Falla directa por import inexistente de CAPEX. | Se resuelve al restaurar el archivo CAPEX; luego rerun de tests. |
| Front lint: `setup-jest.ts` fuera de tsconfig | ESLint type-aware revisa archivo no incluido en los tsconfig de `parserOptions.project`. | Incluir `setup-jest.ts` en `tsconfig.spec.json` o excluirlo del lint type-aware (menos recomendable). |
| Front lint: `no-unsafe-return` y `no-floating-promises` en specs | Specs devuelven valores `any` y promesas sin `await`/`void`. | Tipar mocks/retornos y usar `await` o `void` explicito en llamadas async. |
| Front tests: `jest` no instalado realmente | `package.json` declara jest, pero no aparece en `node_modules`. | Instalacion limpia en `client` (`npm install` tras limpiar estado), verificar `npm ls jest`, luego `npm test`. |
| Front build: presupuesto inicial excedido (+492 kB) | Bundle inicial ~992 kB supera budget de 500 kB. | Reducir peso en entrypoint, lazy-load de vistas pesadas, diferir carga de Highcharts/jspdf/leaflet, y ajustar budget solo si esta justificado. |
| Front build: SCSS excede budget | `configure-project.component.scss` supera limite por ~1.08 kB. | Extraer estilos compartidos, simplificar reglas/nesting y eliminar CSS no usado. |
| Warnings CommonJS/no-ESM (`highcharts`, `leaflet`, `html2canvas`, `canvg/core-js`, etc.) | Angular marca optimization bailouts por dependencias CJS. | Usar variantes ESM cuando existan, lazy-load donde aplique, y `allowedCommonJsDependencies` solo para casos inevitables. |
| Incompatibilidad TS 5.9.3 vs `typescript-eslint` (<5.4) | Puede generar ruido/falsos positivos de lint. | Alinear versiones: bajar TS al rango soportado o subir `@typescript-eslint` a version compatible con TS 5.9. |
| Scripts root cortan en server y ocultan estado client | `npm run lint/build/test` en raiz usa `&&`; si server falla, client no se evalua. | En CI, correr server y client como jobs separados o en paralelo para obtener diagnostico completo siempre. |

## Orden recomendado de arreglo

1. Restaurar archivo CAPEX faltante.
2. Corregir firma de `estimateProject` y limpiar errores lint backend acoplados.
3. Ajustar `server/vitest.config.ts` para excluir `dist/**`.
4. Reparar instalacion de Jest en client y el tsconfig de `setup-jest.ts`.
5. Resolver errores lint frontend en specs.
6. Atacar warnings de bundle/CommonJS (optimizacion).
7. Alinear versiones TypeScript / `typescript-eslint`.

