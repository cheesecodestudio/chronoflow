# Chronoflow — Visión del producto

## Problema que resuelve

Chronoflow permite visualizar de forma clara cuánto tiempo ha pasado desde que ocurrió o comenzó algo, o cuánto falta para que ocurra un evento futuro.

El producto debe servir tanto como herramienta personal de seguimiento como pantalla de presentación continua.

## Definición corta

Aplicación web para crear contadores de tiempo transcurrido y countdowns, administrarlos desde una vista de gestión y reproducirlos como una presentación fullscreen automática.

## Tipos de timer

Solo existen dos tipos principales.

### 1. Counter

Mide el tiempo transcurrido desde una fecha y hora inicial.

Ejemplo:

> NO Tomar Café  
> 3 días 4 horas 5 minutos 2 segundos

La aplicación no guarda el valor acumulado. Guarda el instante inicial y calcula la duración respecto al momento actual.

### 2. Countdown

Mide cuánto falta hasta una fecha y hora futura.

Ejemplo:

> Viaje a Colombia  
> Faltan 2 días 4 horas 5 minutos 2 segundos

Cuando llega a cero, deja de mostrar valores negativos y pasa a estado completado.

Texto inicial sugerido para dicho estado:

> Llegó el momento

## Experiencias principales

### Manage View

Vista para:

- crear timers;
- eliminar timers;
- reiniciar counters;
- ver todos los timers como cards;
- iniciar la presentación.

No existe edición ni actualización general de timers en el MVP.

### Presentation View

Vista fullscreen donde:

- aparece un timer por vez;
- cada timer permanece visible 5 segundos;
- se usa una transición fade sencilla;
- luego aparece el siguiente;
- al llegar al último vuelve al primero;
- el ciclo continúa en loop.

## Evolución esperada

Después de validar el MVP local, el producto podrá evolucionar hacia:

1. sincronización mediante Supabase;
2. autenticación;
3. chat de IA para crear y administrar timers usando lenguaje natural;
4. notificaciones web;
5. notificaciones por email;
6. mejoras visuales y otras funciones basadas en uso real.

## Principio de alcance

No agregar funcionalidades futuras antes de validar correctamente el flujo principal:

**crear → persistir → visualizar → presentar.**
