# Chronoflow — Roadmap y criterios de avance

Este documento define qué debe existir antes de pasar de una fase a otra.

No iniciar una fase posterior solamente porque sea técnicamente interesante.

---

# Fase 0 — Definición

## Objetivo

Cerrar alcance, arquitectura y criterios del MVP 1.

## Debe existir

- visión del producto definida;
- solo dos tipos de timer;
- modelo de datos decidido;
- decisión explícita de no edición;
- estrategia de zonas horarias;
- Temporal + polyfill decidido;
- estrategia de persistence repository definida;
- alcance de Presentation View definido;
- estrategia de testing definida;
- roadmap documentado.

## Gate de salida

La fase termina cuando los documentos de `context/` reflejan las decisiones vigentes y no existen dudas bloqueantes sobre el alcance inicial.

Estado: completada antes del inicio del MVP 1.

---

# MVP 1 — Timers locales + Presentation View

## Objetivo

Construir una aplicación web útil y desplegada que permita crear y visualizar counters y countdowns sin backend.

## Entregables

### Fundaciones

- proyecto Vite + React + TypeScript;
- Tailwind;
- shadcn/ui;
- router;
- Temporal polyfill;
- Vitest.

### Dominio

- `Timer` discriminated union;
- `CounterTimer`;
- `CountdownTimer`;
- zona horaria;
- utilidades temporales;
- validaciones.

### Persistencia

- `TimerRepository`;
- `LocalStorageTimerRepository`;
- storage versionado;
- persistencia verificada después de reload.

### Manage View

- listado de cards;
- Create Counter;
- Create Countdown;
- Delete + confirmación;
- Restart Counter + confirmación;
- sin `Update`/`Edit`; el CRUD del MVP 1 se limita a create, read y delete, más restart para counters.

### Presentation View

- una card a pantalla completa;
- 5 segundos por timer;
- fade;
- loop;
- anterior;
- siguiente;
- pausa;
- reanudar;
- fullscreen;
- Escape.

### Testing

- tests temporales obligatorios;
- tests de repository;
- pruebas principales de UI;
- testing manual final.

### Deployment

- aplicación desplegada;
- funcionamiento validado fuera de localhost.

## Gate de salida

No pasar a MVP 1.1 o MVP 2 hasta que:

- todos los flujos principales funcionen;
- localStorage sobreviva reload/reapertura;
- las fechas sean correctas en los tests definidos;
- Presentation View funcione en loop;
- controles de teclado funcionen;
- exista deployment funcional;
- no haya bugs críticos conocidos en crear, borrar, reiniciar o calcular timers.

Estado: completado el 2026-08-22 después de testing manual y deployment funcional.

---

# MVP 1.1 — Mejoras basadas en uso

## Objetivo

Mejorar UX únicamente después de usar el MVP 1 real.

## Entregables comprometidos

- mejores empty states y estados de error;
- duplicar timer;
- mostrar/ocultar segundos;
- duración global configurable, con `5000 ms` como valor predeterminado;
- color/icono por card;
- reordenamiento con alternativa accesible al drag & drop;
- revisión de accesibilidad y hardening;
- regresión, deployment y cierre documental.

La especificación ejecutable, orden, branches y criterios por tarea se encuentran en [`08-mvp-1.1-roadmap.md`](./08-mvp-1.1-roadmap.md).

## Entregable condicionado

- reintroducir Edit solo si el uso demuestra necesidad y se cumple el gate de `MVP-117`.

## Gate de entrada

El MVP 1 debe estar probado manualmente y desplegado.

Estado: cumplido. MVP 1.1 es la fase activa.

## Gate de salida

- los tickets comprometidos fueron integrados o descartados explícitamente;
- no existen bugs críticos conocidos;
- test, lint y build pasan;
- testing manual y cross-browser está completado;
- deployment funcional validado fuera de localhost;
- documentación de `context/` actualizada.

---

# MVP 2 — Supabase + autenticación + sincronización

## Objetivo

Mover persistencia a backend y permitir sincronización entre dispositivos.

## Entregables previstos

- Supabase project;
- auth;
- tabla `timers`;
- RLS;
- `SupabaseTimerRepository`;
- migración/importación desde localStorage;
- sincronización del usuario autenticado.

## Modelo aproximado

```text
timers
- id
- user_id
- title
- type
- start_at
- target_at
- time_zone
- position
- created_at
- updated_at
```

## Gate de salida

- usuario autenticado solo puede acceder a sus propios timers;
- RLS validado;
- CRUD permitido por producto funciona remotamente. `Update`/`Edit` sigue fuera de alcance salvo decisión explícita del producto;
- import localStorage → Supabase funciona;
- timers aparecen correctamente en más de un dispositivo/sesión.

---

# MVP 3 — Chat IA

## Objetivo

Permitir administrar timers con lenguaje natural.

## Ejemplos

```text
"Dejé de tomar café ayer a las 3pm"
```

→ crear counter.

```text
"Viajo a Colombia el 15 de diciembre a las 6am"
```

→ crear countdown.

```text
"Reinicia el contador de café"
```

→ restart.

```text
"Elimina el countdown de Colombia"
```

→ delete con confirmación.

## Arquitectura

- React no contiene API keys;
- Supabase Edge Function llama al LLM;
- LLM devuelve acción estructurada;
- aplicación valida la acción;
- repository ejecuta la acción.

## Acciones iniciales

- create timer;
- restart counter;
- delete timer.

No implementar update mientras Edit no sea parte del producto.

## Gate de salida

- lenguaje natural se convierte en acciones estructuradas válidas;
- acciones ambiguas no ejecutan cambios silenciosos;
- delete requiere confirmación;
- claves permanecen en backend;
- acciones inválidas son rechazadas.

---

# MVP 4 — Notificaciones

## Objetivo

Avisar al usuario antes de eventos relevantes.

## Canales previstos

- Web Push;
- Email.

## Modelo futuro sugerido

No llenar `timers` con múltiples columnas de notificación.

Preferir una relación similar a:

```text
timers
  ↓
timer_notifications
```

Un timer puede tener varias reglas.

Ejemplos:

- 1 semana antes;
- 1 día antes;
- 1 hora antes.

## Gate de entrada

Supabase/backend debe estar funcionando antes de diseñar notificaciones persistentes.

---

# Futuro no priorizado

Posibles extensiones:

- compartir timers;
- temas;
- estadísticas;
- categorías;
- tags;
- PWA;
- mobile app;
- historial de streaks;
- dashboards.

Estas ideas no forman parte del roadmap comprometido hasta ser priorizadas explícitamente.
