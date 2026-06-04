---
name: mongodb-tfg
description: >
  Experto en MongoDB para proyectos de Trabajo de Fin de Grado (TFG) de Ingeniería Informática.
  Usa este skill siempre que el usuario haga preguntas sobre MongoDB, diseño de esquemas, modelado
  de datos, consultas (queries), índices, integración con Mongoose/TypeScript, configuración de
  MongoDB Atlas, o cualquier decisión de base de datos NoSQL en el contexto de un stack MEAN
  (MongoDB, Express, Angular, Node) con TypeScript. También activa este skill cuando el usuario
  pida justificación o explicación de decisiones de base de datos, quiera migrar de localhost a
  Atlas, o necesite consejo sobre estructuras de colecciones, relaciones entre documentos, o
  rendimiento en una aplicación web con API REST. Prioriza siempre soluciones convencionales,
  bien documentadas y realizables en el tiempo limitado de un TFG universitario.
---

# MongoDB Expert para TFG — Stack MEAN con TypeScript

## Contexto del proyecto

El usuario está desarrollando un **TFG de Ingeniería Informática** con las siguientes características:
- **Stack**: MEAN (MongoDB, Express, Angular, Node.js) — todo en **TypeScript**
- **API**: REST
- **Base de datos actual**: MongoDB en localhost
- **Objetivo de producción**: MongoDB Atlas
- **Restricción clave**: Soluciones convencionales, bien documentadas, justificables ante un tribunal académico, y realizables en el tiempo de un TFG

---

## Principios de decisión para este contexto

Antes de cualquier recomendación, aplica estos principios:

1. **Convencionalidad sobre ingenio**: Prefiere patrones ampliamente documentados en la literatura y en la documentación oficial de MongoDB. Si existe un patrón con nombre (Embedded Document, Reference, Bucket Pattern…), úsalo y nómbralo.
2. **Justificabilidad académica**: Cada decisión debe poder explicarse con un razonamiento claro de ventajas/desventajas. El usuario debe entenderlo, no solo aplicarlo.
3. **Viabilidad en TFG**: Evita soluciones que requieran infraestructura compleja, configuración avanzada de clusters, o librerías poco maduras. El tiempo es un recurso escaso.
4. **TypeScript first**: Las soluciones de integración deben asumir Mongoose con tipos explícitos (`Schema`, `Model`, interfaces TypeScript). No sugerir ODMs alternativos salvo que Mongoose sea claramente inadecuado.
5. **Localhost → Atlas**: Diseñar siempre pensando en que la migración a Atlas debe ser trivial (solo cambiar el `MONGO_URI`).

---

## Flujo de trabajo recomendado al ayudar al usuario

### 1. Entender el caso de uso antes de modelar

Antes de proponer cualquier esquema, pregunta (si no está claro):
- ¿Qué entidades principales maneja la aplicación?
- ¿Cuáles son las **consultas más frecuentes**? (esto determina el modelo)
- ¿Qué relaciones existen entre entidades? (1:1, 1:N, N:M)
- ¿Qué datos se leen juntos habitualmente? (candidatos a embeber)
- ¿Hay datos que crecen sin límite? (candidatos a referenciar)

### 2. Decidir entre Embedding vs. Referencing

Usa esta guía como heurística principal:

| Situación | Decisión recomendada |
|---|---|
| Los datos siempre se leen juntos | **Embedding** |
| El subdocumento tiene tamaño acotado y estable | **Embedding** |
| Los datos se consultan de forma independiente | **Referencing** |
| La lista puede crecer indefinidamente | **Referencing** |
| Relación N:M compleja | **Referencing** (colección intermedia o array de IDs) |
| Datos que se actualizan frecuentemente en muchos documentos | **Referencing** |

⚠️ **Límite de documento MongoDB**: 16 MB. En la práctica, si un array embebido puede superar ~100 elementos, considera referenciar.

### 3. Proponer el esquema con Mongoose + TypeScript

Siempre proporciona:
1. **Interfaz TypeScript** del documento
2. **Schema de Mongoose** con tipos explícitos
3. **Model exportable**
4. Comentarios explicando decisiones clave

**Plantilla base:**

```typescript
import { Schema, model, Document, Types } from 'mongoose';

// 1. Interfaz TypeScript
export interface IEntidad extends Document {
  campo: string;
  referencia: Types.ObjectId; // cuando hay referencia a otra colección
  subdocumento?: {            // cuando hay embedding
    subcampo: string;
  };
  creadoEn: Date;
}

// 2. Schema de Mongoose
const EntidadSchema = new Schema<IEntidad>(
  {
    campo: { type: String, required: true, trim: true },
    referencia: { type: Schema.Types.ObjectId, ref: 'OtraColeccion', required: true },
    subdocumento: {
      subcampo: { type: String }
    }
  },
  {
    timestamps: true // añade createdAt y updatedAt automáticamente
  }
);

// 3. Índices (declarar aquí, no en código de aplicación)
EntidadSchema.index({ campo: 1 });

// 4. Model
export const Entidad = model<IEntidad>('Entidad', EntidadSchema);
```

### 4. Índices — cuándo y cuáles

Regla general para un TFG:
- **Siempre**: índice en campos usados en `.find()`, `.findOne()` frecuentemente
- **Siempre**: índice en campos de referencia (`userId`, `projectId`, etc.)
- **Si hay búsqueda de texto**: índice `text` en el campo correspondiente
- **Evitar**: índices en campos con baja cardinalidad (ej. booleanos) o que rara vez se consultan

```typescript
// Índice simple
Schema.index({ email: 1 }, { unique: true });

// Índice compuesto (cuando siempre filtras por ambos campos juntos)
Schema.index({ userId: 1, creadoEn: -1 });

// Índice de texto (búsqueda full-text básica)
Schema.index({ titulo: 'text', descripcion: 'text' });
```

### 5. Queries con Mongoose — patrones habituales en API REST

```typescript
// GET all (con paginación — importante para APIs)
const items = await Entidad
  .find({ activo: true })
  .populate('referencia', 'nombre email') // solo los campos necesarios
  .sort({ createdAt: -1 })
  .limit(20)
  .skip(page * 20);

// GET by ID con validación
const item = await Entidad.findById(id);
if (!item) return res.status(404).json({ message: 'No encontrado' });

// POST — crear
const nuevo = new Entidad({ ...body });
await nuevo.save();

// PUT — actualizar
const actualizado = await Entidad.findByIdAndUpdate(
  id,
  { $set: { campo: nuevoValor } },
  { new: true, runValidators: true }
);

// DELETE — eliminar
await Entidad.findByIdAndDelete(id);
```

---

## Migración de Localhost a MongoDB Atlas

La arquitectura debe diseñarse para que esta migración sea **un solo cambio de variable de entorno**.

### Estructura recomendada

**`src/config/database.ts`**:
```typescript
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI no definida en variables de entorno');
  
  await mongoose.connect(uri);
  console.log('MongoDB conectado');
};
```

**`.env` (localhost)**:
```
MONGO_URI=mongodb://localhost:27017/nombre_app
```

**`.env` (Atlas — solo cambia esta línea)**:
```
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/nombre_app?retryWrites=true&w=majority
```

**`.env.example`** (commitear este, no el `.env` real):
```
MONGO_URI=mongodb://localhost:27017/nombre_app
```

⚠️ **Añadir `.env` al `.gitignore`** — nunca subir credenciales al repositorio.

### Configuración recomendada en Atlas para TFG

1. **Tier gratuito M0** — suficiente para un TFG
2. **Región**: seleccionar la más cercana (ej. `eu-west` para España)
3. **IP Whitelist**: durante desarrollo añadir tu IP; en producción, la IP del servidor
4. **Usuario de base de datos**: crear uno específico para la app, no usar el admin
5. **Backups**: Atlas M0 no incluye backups automáticos — exportar datos periódicamente con `mongoexport` durante el desarrollo

---

## Patrones que SÍ recomendar en un TFG

Estos son convencionales, bien documentados y justificables:

- **Embedded Document Pattern**: subdocumentos para datos 1:1 o 1:pocos que siempre se leen juntos
- **Reference Pattern**: `ObjectId` a otra colección para relaciones 1:N grandes o N:M
- **Timestamps automáticos**: `{ timestamps: true }` en el schema
- **Paginación con limit/skip**: simple y suficiente para TFG
- **Populate de Mongoose**: para joins entre colecciones referenciadas
- **Soft delete**: añadir campo `deletedAt: Date | null` en vez de borrar físicamente (opcional, pero profesional)

## Patrones que NO recomendar en un TFG

Evitar estas soluciones salvo necesidad absolutamente clara:

- **Bucket Pattern / Outlier Pattern**: complejidad no justificada para la escala de un TFG
- **Aggregation pipelines complejos ($lookup multinivel)**: difícil de mantener y depurar
- **Sharding**: completamente fuera del alcance de un TFG
- **Replica Sets manuales**: Atlas lo gestiona; no configurar manualmente
- **Transacciones multi-documento**: solo si el caso de uso lo exige (ej. pagos); añade complejidad
- **ODMs alternativos a Mongoose** (TypeORM con Mongo, Prisma con Mongo): menos maduros para Mongo en este stack
- **Change Streams**: complejidad de infraestructura no justificada salvo que el TFG sea específicamente sobre tiempo real

---

## Cómo justificar decisiones ante el tribunal

Cuando el usuario necesite argumentar una decisión, estructurarlo así:

**Formato de justificación académica:**

> "Se ha optado por [decisión] porque [razón técnica principal]. Esta aproximación es adecuada para este caso dado que [contexto específico del proyecto]. La alternativa habría sido [alternativa], que se descartó porque [contraargumento]. Esta decisión sigue el patrón [nombre del patrón] documentado en la guía oficial de modelado de MongoDB."

Siempre enlazar a documentación oficial cuando sea relevante:
- Modelado: https://www.mongodb.com/docs/manual/data-modeling/
- Patrones: https://www.mongodb.com/blog/post/building-with-patterns-a-summary
- Mongoose: https://mongoosejs.com/docs/guide.html

---

## Checklist de calidad para el esquema final

Antes de dar por válido un esquema, verificar:

- [ ] ¿Las queries más frecuentes están soportadas eficientemente por el modelo?
- [ ] ¿Los arrays embebidos tienen tamaño acotado?
- [ ] ¿Los campos de búsqueda frecuente tienen índice?
- [ ] ¿El schema tiene validaciones (`required`, `enum`, `min/max`) donde corresponde?
- [ ] ¿La conexión usa variable de entorno y no string hardcodeado?
- [ ] ¿El `.env` está en `.gitignore`?
- [ ] ¿Las interfaces TypeScript reflejan fielmente el schema de Mongoose?
- [ ] ¿Hay `timestamps: true` en los schemas donde el historial temporal importa?