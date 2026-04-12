## DONE
- [DONE] Cambiar la pantalla de My Projects para que aproveche todo el ancho, como lo hacen la de dashboard y la de paneles
- [DONE] Modificar las páginas de settings y de usuario para que se parezcan a las de dashboard y my projects.
- [DONE] Mordernizar la vista de un proyecto (view-project). PD: Además unifiqué las vistas de configure project con view project.
- [DONE] Esto de mostrar y ocultar me vendría bien para la vista de view-project, podría reutilizar lo que tengo en configure project y que la vista de view-project sea una especie de read-only de configure project.
  - [DONE] Obviamente haría falta añadir algunos datos más para la vista de view-project, pero creo que la idea es buena y me evito crear mil pantallas y diseños diferentes.
- [DONE] Ver si es posible usar un único layout para los dos tipos de usuario (user y admin)
  - [DONE] Y que en función del tipo de usuario se muestren/oculten pantallas
- [DONE] Ver si en ciertas pantallas que son esencialmente las mismas, puedo también mostrar botones, información sólo si eres admin.
- [DONE] Implementar la nueva version de la pantalla de crear proyecto (debería seguir la idea de que se use el ancho de la pantalla.)
  - [DONE] NO SE ESTÁ BLOQUEANDO EL PASAR DE PANTALLA SI NO SE TIENE EL POLIGONO - REVISAR ESO
- [DONE] *Hacer la prueba con un usuario normal, no admin.*
- [DONE] Revisar los datos que se muestran con el create projejct wizard a comparacion del configure project wizard.
- [DONE] Revisar los cálculos que se hacen y que se muestran y ver que estén todos completos (uno de los requisitos de la ultima reunion)
- [DONE] Revisar que cuando se expande el menú, o se contrae, se guarde esa configuracion al moverse entre pantallas. -> **hace como un refresh cuando cambio al de panels. En el resto no ocurre**
- [DONE] REFACTOR de las tarjetas dentro de my projects (user-projects) para que usen el p-card de primeng y no un estilo custom.
- [DONE] Unificar manage projects (admin) y user-projects
- [DONE]Modificar la forma en la que se filtran los panels, reemplazarla por la que se usa para los proyectos.
- [DISMISSED] User activation / deactivation — requires adding `isActive: boolean` to the Mongoose `UserModel` schema + a `PATCH /api/users/:id/status` endpoint. UI: toggle switch in the actions column of the user management table.

## TO-DO
- [PLANNED]Cuando se acaba la creación del project, no se rellenan automáticamente los valores de country, currency, region (cosa que si ocurre cuando se edita el proyecto mediant configure-project)
- [PLANNED]Figure out que hacer con eso de sunPath data (como afecta el sol a esa ubicación a lo largo de un año). Esto podría mostrarlo simplemente y además usarlo para mejorar mis cálculos.
- [TO-DO]Vamos a añadir algo para ver si se generan sombras por obstáculos de gran altura?
- 

### ADMIN FEATURES

----

# POSSIBLE TFG FEATURES
- Inclination Algorithm to assess if area selected has good inclination propperties -> do we have to compensate? Is it feasible? Find a tool to calculate the inclination. What about solar panels with movement?
- Comparador de Estructuras (Fijo vs. 1 Eje vs. 2 Ejes) -> supuestamente 3 días de desarrollo
- Módulo de Autoconsumo Real (Demanda vs. Generación). Determinar si se tendría una un exceso de energía (para almacenar o devolver a la red) o se necesita consumo de la red. -> supuestamente 5 dias de desarrollo
-  Simulador de Almacenamiento (Baterías y Sales) -> supuestamente 7 días de desarrollo
-   Implementación del Modelo Sandia (Rendimiento Realista) -> supuestamente 12 días de desarrollo.





