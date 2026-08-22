# Chronoflow — Requisitos del producto

## Requisitos del MVP 1

### Timers

El sistema debe permitir crear únicamente:

- `counter`;
- `countdown`.

Cada timer debe incluir:

- `id`;
- `title`;
- `type`;
- zona horaria;
- instante relevante (`startAt` o `targetAt`);
- `position`;
- fecha de creación;
- fecha de última actualización.

## Counter

Un counter debe:

- aceptar una fecha/hora inicial;
- usar el momento actual como valor por defecto al crearlo;
- impedir una fecha inicial futura;
- calcular dinámicamente el tiempo transcurrido;
- permitir `Restart`;
- pedir confirmación antes de hacer `Restart`.

### Restart

Reiniciar un counter debe:

- conservar `id`;
- conservar `title`;
- conservar `position`;
- conservar `timeZone`;
- reemplazar `startAt` por el instante actual;
- actualizar `updatedAt`.

## Countdown

Un countdown debe:

- aceptar una fecha/hora futura;
- impedir crear un countdown cuyo destino ya haya pasado;
- calcular dinámicamente cuánto falta;
- pasar a estado completado al alcanzar su fecha objetivo;
- nunca mostrar duración negativa al usuario.

Estado inicial sugerido al completarse:

`Llegó el momento`

## Eliminación

Todo timer debe poder eliminarse.

La eliminación debe requerir confirmación.

## Edición

**No existe edición ni actualización general (`Update`) en el MVP 1.**

Si un timer fue creado incorrectamente, el flujo temporal será:

1. eliminarlo;
2. crearlo nuevamente.

La necesidad de edición se reevaluará únicamente si el uso real demuestra que hace falta. No se debe implementar como parte del CRUD actual.

### Operaciones del MVP 1

El CRUD del MVP 1 está limitado a:

- `Create`: crear un counter o countdown;
- `Read`: listar y consultar timers;
- `Delete`: eliminar timers con confirmación.

`Restart` es una acción específica permitida únicamente para counters. No equivale a edición general.

`Update`/`Edit` no se implementará en el MVP 1.

## Manage View

Ruta definitiva:

`/manage`

Debe mostrar timers como cards.

Cada card puede incluir:

- título;
- tipo;
- duración actual;
- acción `Restart` si es counter;
- acción `Delete`.

Acciones globales:

- crear nuevo timer;
- abrir Presentation View.

## Create Timer

El formulario debe permitir:

- título;
- tipo;
- fecha;
- hora.

### Si es Counter

Mostrar fecha/hora inicial.

Default: ahora.

### Si es Countdown

Mostrar fecha/hora objetivo.

Debe ser posterior al momento actual.

## Presentation View

Ruta definitiva:

`/view`

Comportamiento:

- un timer ocupa la vista principal;
- duración visible fija: `5000 ms`;
- fade sencillo;
- loop infinito;
- sin paneles permanentes de administración.

### Controles

- `ArrowLeft`: timer anterior;
- `ArrowRight`: timer siguiente;
- `Space`: pausar/reanudar;
- `Escape`: salir primero de fullscreen y después de Presentation View si fullscreen ya está cerrado;
- Fullscreen API para ocupar toda la pantalla.

Los controles visuales pueden mostrarse temporalmente al mover el mouse.

## Persistencia

El MVP usa `localStorage`.

Clave:

`chronoflow:timers:v1`

El valor persistido debe tener esta forma:

```json
{
  "version": 1,
  "timers": []
}
```

No se debe guardar el valor del contador cada segundo.

Solo se guardan los instantes base y el resto se calcula en runtime.

## Zona horaria

Cada timer debe guardar su zona horaria IANA, por ejemplo:

- `America/Costa_Rica`;
- `America/New_York`;
- `Europe/Madrid`.

La zona no debe depender implícitamente del dispositivo después de crear el timer.

Al crear un timer, la aplicación detectará la zona IANA del navegador mediante `Intl.DateTimeFormat().resolvedOptions().timeZone`, la mostrará al usuario y la guardará explícitamente en el timer.

Las fechas y horas introducidas se interpretarán en esa zona y se persistirán como instantes ISO UTC. Para horas ambiguas o inexistentes durante DST se usará la política Temporal `compatible`.

## Reglas operativas

- Los casos de uso generan `id` mediante `crypto.randomUUID()`.
- Los casos de uso generan `createdAt` y `updatedAt` como ISO UTC.
- El primer `position` es `0`; los siguientes usan el máximo actual más uno.
- Al eliminar un timer no se compactan las posiciones existentes.
- `getAll()` devuelve siempre los timers ordenados por `position` ascendente.
- El título se recorta con `trim()`, es obligatorio y admite como máximo 100 caracteres.
- La duración se muestra usando años, meses, días, horas, minutos y segundos de calendario real, omitiendo unidades en cero salvo que toda la duración sea cero, en cuyo caso se muestra `0 segundos`.
- Un `countdown` completado muestra `Llegó el momento`, permanece en el loop de presentación y nunca muestra valores negativos.
- Con cero timers, Presentation View muestra un estado vacío. Con un solo timer, permanece en ese timer sin cambios innecesarios.
- La navegación manual reinicia el intervalo de 5000 ms.

## Fuera del MVP 1

No implementar todavía:

- editar timers;
- actualización general (`Update`);
- autenticación;
- Supabase;
- sincronización multi-dispositivo;
- chat IA;
- notificaciones web;
- notificaciones por email;
- drag & drop;
- temas complejos;
- estadísticas;
- categorías;
- tags;
- compartir timers;
- duración configurable por slide;
- transiciones configurables;
- PWA;
- aplicación móvil.
