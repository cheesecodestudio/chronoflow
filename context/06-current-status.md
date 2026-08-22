# Chronoflow — Estado actual

Última actualización de contexto: **2026-08-22**.

## Fase actual

**MVP 1.1 — Mejoras basadas en uso**

Estado: **MVP 1 cerrado; backlog ejecutable del MVP 1.1 definido y listo para implementación**.

La Fase 0 y el MVP 1 están completados. El flujo local crear → persistir → visualizar → presentar fue probado manualmente y validado en deployment.

## Decisiones cerradas

- [x] Nombre del producto: Chronoflow.
- [x] Objetivo principal definido.
- [x] Solo existen `counter` y `countdown`.
- [x] No se guarda el contador cada segundo.
- [x] Se guarda el instante base y se calcula en runtime.
- [x] Persistencia MVP: localStorage.
- [x] Storage separado de UI mediante repository.
- [x] React + TypeScript + Vite.
- [x] Tailwind + shadcn/ui.
- [x] React Router.
- [x] Zustand permitido si aporta valor.
- [x] CRUD del MVP 1 limitado a Create, Read y Delete.
- [x] `Update`/`Edit` no existe en MVP 1.
- [x] Counter tiene Restart con confirmación.
- [x] Delete requiere confirmación.
- [x] Countdown completado muestra estado no negativo.
- [x] Presentation View usa cards fullscreen.
- [x] Slide visible durante 5 segundos.
- [x] Fade simple.
- [x] Loop infinito.
- [x] Controles teclado: izquierda, derecha, espacio y Escape.
- [x] Fullscreen.
- [x] Duración configurable quedó fuera del MVP 1 y fue planificada para `MVP-114`.
- [x] Temporal API + polyfill.
- [x] Zona horaria IANA detectada, mostrada y almacenada por timer.
- [x] Política DST `compatible`.
- [x] Duración basada en calendario real con años, meses, días, horas, minutos y segundos.
- [x] IDs con `crypto.randomUUID()`.
- [x] `position` inicia en 0, continúa con máximo más uno y no se compacta al borrar.
- [x] Storage versionado con `{ version: 1, timers: [] }`.
- [x] Títulos con `trim()`, obligatorios y de máximo 100 caracteres.
- [x] Vitest para lógica temporal.
- [x] Notificaciones web + email quedan en roadmap futuro.
- [x] Supabase se implementa después de validar MVP local.
- [x] Chat IA se implementa después de Supabase.

## Fundaciones completadas

- [x] Proyecto base Vite + React + TypeScript.
- [x] Tailwind CSS v4 con plugin de Vite.
- [x] React Router configurado con `/manage` y `/view`.
- [x] Temporal polyfill instalado.
- [x] Vitest, Testing Library y jsdom configurados.
- [x] Build, test smoke y lint iniciales verificados.
- [x] Tipos discriminados `Timer`, `CounterTimer` y `CountdownTimer`.
- [x] Validaciones de título, zona horaria y fechas temporales.
- [x] Cálculo de elapsed y remaining con calendario real.
- [x] Formateo de duraciones en español sin unidades cero.
- [x] Conversión de fecha/hora local a instante UTC con DST `compatible`.
- [x] Tests temporales iniciales para UTC, Costa Rica, DST y años/calendario.
- [x] `TimerRepository` definido sin `Update` general.
- [x] `LocalStorageTimerRepository` con envelope versionado.
- [x] Casos de uso de creación con ID, timestamps y `position`.
- [x] Delete sin compactar `position`.
- [x] Restart de counters preservando identidad y metadatos.
- [x] Persistencia y recuperación después de recrear el repository.
- [x] Manage View con empty state, listado responsive y resumen de timers.
- [x] Create Counter y Create Countdown desde formulario controlado.
- [x] Delete con confirmación.
- [x] Restart de counters con confirmación.
- [x] Duraciones actualizadas en runtime.
- [x] Pruebas de UI para create, delete, restart y empty state.
- [x] Presentation View con un timer visible por vez.
- [x] Loop automático de 5000 ms y transición fade de 280 ms.
- [x] Anterior, siguiente y loop circular.
- [x] Pause/resume y controles de teclado.
- [x] Fullscreen API y salida mediante `Escape`.
- [x] Estado completado sin duración negativa.
- [x] Pruebas de Presentation View con fake timers y Fullscreen mock.
- [x] Verificación manual desktop y mobile viewport.
- [x] Presentation View ajustado a `100dvh` en `sm+`; mobile permite scroll vertical cuando el contenido lo necesita.
- [x] Escalado responsive del título, unidades temporales y controles con breakpoints de Tailwind.
- [x] Controles compactos y táctiles en mobile, con auto-ocultado y reaparición mediante touch.
- [x] Validación local en Chromium para Desktop HD (1920x1080), Laptop (1366x768), Tablet (768x1024), Mobile Grande (414x896), Mobile Estándar (375x667) y Mobile Pequeño (320x568), incluyendo scroll mobile.
- [x] Caso extremo validado con título de 93 caracteres y las seis unidades temporales visibles.
- [x] Suite automatizada actualizada: 41 pruebas pasando, build y lint verificados.
- [x] MVP-111 implementado: estados vacíos y de error diferenciados, reintento y navegación responsive.
- [x] Suite automatizada de MVP-111: 50 pruebas pasando, build y lint verificados.
- [x] Testing manual final completado.
- [x] Funcionamiento validado en deployment real.
- [x] MVP 1 cerrado el 2026-08-22.
- [x] Duración predeterminada oficial de slides alineada en `5000 ms`.
- [x] Backlog ejecutable del MVP 1.1 documentado en `08-mvp-1.1-roadmap.md`.
- [x] **MVP-110 completado**: contexto sincronizado, MVP 1 cerrado, MVP 1.1 activo, fade estandarizado en 280 ms con testing, plan de ejecución incorporado al orden de lectura.
- [x] **MVP-1131 completado**: modal contenedor de configuraciones (MVP-1131) y scrollbars alineados con la estética de Chronoflow (navy/cyan, fallback nativo, forced-colors). Solo en `/manage`, placeholders para MVP-113/114/115, sin lógica funcional ni persistencia. Tests, lint, build y verificación manual validados.

## Entregables del MVP 1.1

- [x] `MVP-111`: mejorar estados vacíos y de error.
- [ ] `MVP-112`: duplicar timer.
- [x] `MVP-1131`: modal contenedor de configuraciones y scrollbars temáticos.
- [ ] `MVP-113`: mostrar u ocultar segundos.
- [ ] `MVP-114`: duración global configurable, predeterminada en 5 segundos.
- [ ] `MVP-115`: personalización visual básica.
- [ ] `MVP-116`: reordenar timers con alternativa accesible.
- [ ] `MVP-117`: editar timers, solo si se cumple su gate de entrada.
- [ ] `MVP-118`: accesibilidad y hardening.
- [ ] `MVP-119`: regresión, deployment y cierre del MVP 1.1.

## Qué NO hacer todavía

- [ ] No configurar Supabase.
- [ ] No implementar auth.
- [ ] No implementar chat IA.
- [ ] No agregar `Update`/`Edit` sin cumplir el gate de entrada de `MVP-117`.
- [ ] No implementar notificaciones.
- [ ] No agregar categorías/tags.
- [ ] No construir themes complejos.
- [ ] No crear estadísticas.
- [ ] No convertirlo en PWA.

## Condición para actualizar este documento

Actualizar después de cualquier avance relevante, indicando:

- qué tarea se completó;
- qué fase está activa;
- blockers;
- próximo entregable;
- si cambió alguna decisión de producto o arquitectura.
