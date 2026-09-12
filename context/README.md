# Chronoflow — Contexto del proyecto

Este folder es la fuente de contexto principal para cualquier agente o desarrollador que trabaje en **Chronoflow**.

## Objetivo

Mantener documentados:

- qué producto se está construyendo;
- qué decisiones ya fueron tomadas;
- cuál es la arquitectura acordada;
- qué pertenece y qué no pertenece al MVP actual;
- en qué fase está el proyecto;
- qué falta ejecutar antes de avanzar;
- qué requisitos debe cumplir cada fase para considerarse terminada.

## Orden recomendado de lectura

1. [`01-product-vision.md`](./01-product-vision.md)
2. [`02-product-requirements.md`](./02-product-requirements.md)
3. [`03-technical-architecture.md`](./03-technical-architecture.md)
4. [`04-testing-strategy.md`](./04-testing-strategy.md)
5. [`05-roadmap-and-phase-gates.md`](./05-roadmap-and-phase-gates.md)
6. [`06-current-status.md`](./06-current-status.md)
7. [`07-agent-working-rules.md`](./07-agent-working-rules.md)
8. [`08-mvp-1.1-roadmap.md`](./08-mvp-1.1-roadmap.md) — incluye plan de ejecución MVP 1.1
9. [`09-supabase-schema-and-rls-verification.md`](./09-supabase-schema-and-rls-verification.md) — evidencia del schema y RLS de Supabase
10. [`10-week-1-to-be-c4-architecture.md`](./10-week-1-to-be-c4-architecture.md) — baseline TO-BE de Context y Containers

## Regla de mantenimiento

Cuando una decisión cambie:

1. actualizar primero el documento que define esa decisión;
2. actualizar `06-current-status.md` si afecta el avance;
3. actualizar `05-roadmap-and-phase-gates.md` si cambia el alcance o los criterios de salida de una fase;
4. no dejar decisiones importantes únicamente en conversaciones o commits.

## Estado actual

**Fase actual:** MVP 1.1 — Mejoras basadas en uso.

**Implementación:** MVP 1 funcional, probado manualmente y desplegado. El backlog ejecutable del MVP 1.1 está definido.

Consultar [`06-current-status.md`](./06-current-status.md) para el estado detallado.
