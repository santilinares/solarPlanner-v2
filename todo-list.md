## DONE
- [DONE] Cambiar la pantalla de My Projects para que aproveche todo el ancho, como lo hacen la de dashboard y la de paneles
- [DONE] Modificar las páginas de settings y de usuario para que se parezcan a las de dashboard y my projects.
- [DONE] Mordernizar la vista de un proyecto (view-project). PD: Además unifiqué las vistas de configure project con view project.
- [DONE] Esto de mostrar y ocultar me vendría bien para la vista de view-project, podría reutilizar lo que tengo en configure project y que la vista de view-project sea una especie de read-only de configure project.
  - [DONE] Obviamente haría falta añadir algunos datos más para la vista de view-project, pero creo que la idea es buena y me evito crear mil pantallas y diseños diferentes.

## TO-DO
- REFACTOR de las tarjetas dentro de my projects (user-projects) para que usen el p-card de primeng y no un estilo custom.

### Para las features de admin
- [IN-PROGRESS] Ver si es posible usar un único layout para los dos tipos de usuario (user y admin)
  - [DONE] Y que en función del tipo de usuario se muestren/oculten pantallas
- [DONE] Ver si en ciertas pantallas que son esencialmente las mismas, puedo también mostrar botones, información sólo si eres admin.
- Hacer la prueba con un usuario normal, no admin.
  
### Importantes para la proxima reunión
- Implementar la nueva version de la pantalla de crear proyecto (debería seguir la idea de que se use el ancho de la pantalla.)
  - **NO SE ESTÁ BLOQUEANDO EL PASAR DE PANTALLA SI NO SE TIENE EL POLIGONO - REVISAR ESO**
- Revisar los cálculos que se hacen y que se muestran y ver que estén todos completos (uno de los requisitos de la ultima reunion)
---
- Revisar que cuando se expande el menú, o se contrae, se guarde esa configuracion al moverse entre pantallas. -> **hace como un refresh cuando cambio al de panels. En el resto no ocurre**
- Revisar que pasa 
- Modificar la ubicacion del boton de add project
- Unificar manage projects (admin) y user-projects



