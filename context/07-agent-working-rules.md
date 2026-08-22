# Chronoflow — Reglas para agentes y futuras sesiones

## Propósito

Evitar que un agente cambie el rumbo del proyecto, agregue scope innecesario o contradiga decisiones ya tomadas.

## Fuente de verdad

Antes de implementar una funcionalidad, leer:

1. `README.md`;
2. `01-product-vision.md`;
3. `02-product-requirements.md`;
4. `03-technical-architecture.md`;
5. `05-roadmap-and-phase-gates.md`;
6. `06-current-status.md`.
7. `08-mvp-1.1-roadmap.md` cuando MVP 1.1 sea la fase activa.

## Regla de fase

Trabajar únicamente en la fase marcada como activa en `06-current-status.md`, salvo instrucción explícita para modificar el roadmap.

No iniciar features de una fase posterior mientras el gate de la fase actual no esté cumplido.

## Regla contra scope creep

Antes de agregar algo nuevo, clasificarlo:

```text
A. necesario para cumplir el MVP actual
B. bug/fix necesario
C. mejora futura
D. idea no priorizada
```

Solo A y B deben implementarse sin cambiar el roadmap.

C y D deben documentarse para futuro, no implementarse automáticamente.

## Decisiones que no deben revertirse sin aprobación explícita

- solo dos tipos de timer;
- no `Update`/`Edit` en MVP 1; CRUD se limita a create, read y delete;
- Temporal + polyfill;
- guardar zona horaria;
- repository separa UI de storage;
- localStorage antes de Supabase;
- Supabase antes de IA;
- IA mediante acciones estructuradas;
- API keys fuera del frontend;
- notificaciones después de backend;
- testing temporal temprano;
- deployment obligatorio para cerrar MVP 1.

## Implementación

Preferir soluciones pequeñas y mantenibles.

Evitar:

- arquitectura excesiva;
- abstracciones sin uso;
- dependencias innecesarias;
- features futuras adelantadas;
- duplicar lógica temporal dentro de componentes;
- acceder a localStorage directamente desde UI;
- guardar valores del contador cada segundo.

## Testing

No modificar lógica de tiempo sin crear o actualizar tests correspondientes.

Si cambia:

- cálculo temporal;
- validación;
- zona horaria;
- restart;
- estado completed;

se deben revisar los tests de `04-testing-strategy.md`.

## Cambios de decisión

Si el usuario cambia una decisión:

1. modificar el documento fuente correspondiente;
2. revisar si afecta arquitectura;
3. revisar si afecta roadmap;
4. actualizar `06-current-status.md`;
5. registrar el nuevo criterio antes de continuar implementando.

## Fin de una fase

Una fase solo puede marcarse completa cuando se cumple su gate en `05-roadmap-and-phase-gates.md`.

No usar criterios vagos como "ya casi" o "funciona localmente".

El estado debe reflejar entregables comprobables.
