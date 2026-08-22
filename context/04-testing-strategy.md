# Chronoflow — Estrategia de testing

## Objetivo

La lógica temporal es parte central del producto y debe verificarse antes de depender de ella en la UI.

No esperar hasta el final del MVP para escribir todos los tests de fechas.

## Herramienta

Usar Vitest.

Temporal debe estar disponible en el entorno de tests mediante el mismo polyfill usado por la aplicación cuando haga falta.

Ejemplo:

```ts
import "temporal-polyfill/global";
```

Vitest puede controlar el tiempo mediante fake timers y tiempo simulado.

## Orden recomendado

```text
1. Implementar timer.utils.ts
2. Crear tests unitarios temporales
3. Confirmar resultados
4. Construir UI sobre esa lógica
5. Completar MVP
6. Ejecutar testing integral
```

## Tests obligatorios de lógica temporal

### Valores básicos

- 0 segundos
- 1 segundo
- 59 segundos
- 60 segundos
- 59 minutos 59 segundos
- 60 minutos
- 23 horas 59 minutos 59 segundos
- 24 horas

### Calendario

- cambio de día
- cambio de mes
- febrero de 28 días
- febrero de 29 días
- mes de 30 días
- mes de 31 días
- cambio de año
- año bisiesto
- varios meses
- varios años

### Zona horaria

- `America/Costa_Rica`
- `UTC`
- al menos una zona con DST, por ejemplo `America/New_York`
- transición hacia DST
- transición desde DST
- horas ambiguas o inexistentes con política `compatible`

### Counter

- `startAt` igual a ahora
- `startAt` hace 1 segundo
- `startAt` hace 1 día
- `startAt` hace 1 mes
- `startAt` hace 1 año

### Countdown

- `targetAt` dentro de 1 segundo
- `targetAt` dentro de 1 día
- `targetAt` dentro de 1 mes
- `targetAt` dentro de 1 año
- `targetAt` exactamente ahora
- `targetAt` ya pasó
- nunca mostrar duración negativa
- countdown pasado debe resolverse como completado

### Restart

Comprobar que restart:

- cambia `startAt`;
- cambia `updatedAt`;
- conserva `id`;
- conserva `title`;
- conserva `position`;
- conserva `timeZone`.

### Validaciones

- counter futuro → inválido
- countdown pasado → inválido
- title vacío o solo espacios → inválido
- title de más de 100 caracteres → inválido
- title válido → permitido

## Tests de repository

`LocalStorageTimerRepository` debe probar:

- crear timer;
- recuperar timers ordenados por `position`;
- mantener discriminated union correctamente;
- eliminar timer sin compactar posiciones;
- reiniciar counter;
- persistir después de recrear el repository;
- no permitir restart de countdown;
- manejar almacenamiento vacío;
- manejar versión de storage esperada;
- manejar JSON corrupto o datos inválidos de storage.

## Tests de UI necesarios antes de cerrar MVP

Validar al menos:

- Create Counter;
- Create Countdown;
- confirmación Delete;
- confirmación Restart;
- card correcta según tipo;
- countdown completado;
- navegación a Presentation View;
- siguiente/anterior;
- pause/resume;
- loop del último al primero;
- estado cuando no existen timers.

## Testing manual final

Antes de cerrar MVP 1:

- recargar navegador y confirmar persistencia;
- cerrar y abrir aplicación;
- probar con varios timers;
- probar fullscreen;
- probar teclado;
- probar resize;
- probar mobile viewport;
- probar al menos Chrome y otro navegador relevante;
- verificar funcionamiento en deployment real.

## Criterio

Un MVP no puede considerarse terminado solamente porque la UI funcione en localhost.

Debe superar los tests definidos para su fase y estar desplegado.
