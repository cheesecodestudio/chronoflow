# Chronoflow — Arquitectura técnica

## Stack del MVP 1

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Zustand solo donde aporte valor real
- Temporal API
- `temporal-polyfill`
- Vitest

## Principio de arquitectura

La UI no debe conocer directamente cómo se persisten los timers.

Flujo esperado:

```text
React UI
   ↓
State / use cases
   ↓
TimerRepository
   ↓
LocalStorageTimerRepository
   ↓
localStorage
```

Posteriormente:

```text
React UI
   ↓
State / use cases
   ↓
TimerRepository
   ↓
SupabaseTimerRepository
   ↓
Supabase
```

La migración a Supabase no debe requerir reescribir los componentes principales.

## Modelo de dominio

Usar discriminated unions en TypeScript.

```ts
interface TimerBase {
  id: string;
  title: string;
  timeZone: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface CounterTimer extends TimerBase {
  type: "counter";
  startAt: string;
}

interface CountdownTimer extends TimerBase {
  type: "countdown";
  targetAt: string;
}

export type Timer = CounterTimer | CountdownTimer;
```

Esto evita estados inválidos como un countdown sin `targetAt`.

## Formato temporal persistido

Guardar los instantes como ISO UTC.

Ejemplo:

```json
{
  "startAt": "2026-08-20T17:30:00Z",
  "timeZone": "America/Costa_Rica"
}
```

La zona horaria IANA se guarda por separado.

## Temporal

Usar Temporal para:

- instantes;
- zonas horarias;
- años;
- meses;
- días;
- horas;
- minutos;
- segundos;
- diferencias entre fechas;
- calendarios reales;
- transiciones DST cuando correspondan.

Mientras el soporte nativo no sea universal, cargar:

```ts
import "temporal-polyfill/global";
```

Para fechas ambiguas o inexistentes durante DST se usa la política `compatible`.

## Regla para duraciones

No asumir:

```text
1 mes = 30 días
1 año = 365 días
```

Los cálculos con meses y años deben respetar calendario y zona horaria.

La presentación usa años, meses, días, horas, minutos y segundos; omite unidades en cero y muestra `0 segundos` cuando la duración total es cero.

## Utilidades temporales

Centralizar la lógica en una capa utilitaria o de dominio, por ejemplo:

```text
features/timers/
  timer.types.ts
  timer.utils.ts
  timer.repository.ts
  timer.store.ts
```

Funciones esperadas:

```ts
calculateElapsed(timer)
calculateRemaining(timer)
formatDuration(duration)
isCountdownCompleted(timer)
```

Los componentes React no deben implementar cálculos complejos de fecha directamente.

## TimerRepository

Contrato sugerido:

```ts
interface TimerRepository {
  getAll(): Promise<Timer[]>;
  getById(id: string): Promise<Timer | null>;
  create(timer: Timer): Promise<Timer>;
  delete(id: string): Promise<void>;
  restart(id: string): Promise<Timer>;
}
```

El contrato no incluye `update()` general mientras la edición no exista como requisito. El CRUD del MVP 1 solo incluye create, read y delete; `restart()` es una acción específica para counters. `Update`/`Edit` no se implementa en el MVP 1.

Si posteriormente aparece edición, ampliar el contrato de forma explícita.

## Creación de entidades

Los casos de uso, no los componentes ni el repository, son responsables de:

- generar `id` con `crypto.randomUUID()`;
- generar `createdAt` y `updatedAt` como ISO UTC;
- asignar `position` como máximo actual más uno, comenzando en `0`;
- convertir la entrada local en la zona IANA a un instante UTC;
- validar título, tipo y restricciones temporales.

## Zustand

Usar Zustand si ayuda a compartir timers y acciones entre vistas.

No guardar en localStorage mediante Zustand de manera automática si eso acopla la UI al mecanismo de persistencia.

El repository continúa siendo la capa responsable de persistencia.

## Estado persistente vs efímero

Persistente:

```text
- timers
- position
```

Efímero en Presentation View:

```text
- currentIndex
- isPaused
- transitionState
- fullscreen state
```

El estado de presentación no debe persistirse.

## Presentation constants

Para MVP 1:

```ts
export const SLIDE_DURATION_MS = 5000;
export const FADE_DURATION_MS = 280;
```

No crear configuración de usuario para estos valores todavía.

## Estructura sugerida

```text
src/
├── app/
│   ├── App.tsx
│   └── router.tsx
├── components/
│   ├── TimerCard.tsx
│   ├── TimerForm.tsx
│   ├── TimerDisplay.tsx
│   └── TimerActions.tsx
├── pages/
│   ├── ManagePage.tsx
│   └── PresentationPage.tsx
├── features/
│   └── timers/
│       ├── timer.types.ts
│       ├── timer.utils.ts
│       ├── timer.repository.ts
│       └── timer.store.ts
├── infrastructure/
│   └── storage/
│       └── LocalStorageTimerRepository.ts
└── shared/
    └── utils/
```

Mantener esta estructura simple. No implementar Clean Architecture completa ni capas que no tengan responsabilidad concreta.

## Arquitectura futura para IA

La IA no debe tener acceso arbitrario a la base de datos.

Flujo esperado:

```text
Usuario
  ↓
Chat IA
  ↓
LLM
  ↓
Structured Action
  ↓
Validación de aplicación
  ↓
TimerRepository
  ↓
Supabase
```

Acciones iniciales previstas:

```ts
type AIAction =
  | CreateTimerAction
  | RestartTimerAction
  | DeleteTimerAction;
```

No incluir `UpdateTimerAction` mientras el producto no soporte edición.

Las acciones destructivas deben requerir confirmación.

## API keys futuras

Las claves de proveedores de IA nunca deben quedar expuestas en React.

Arquitectura prevista:

```text
React
  ↓
Supabase Edge Function
  ↓
LLM API
```
