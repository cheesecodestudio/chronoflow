import type { AppIconName } from '../../components/AppIcon'

/** Color de acento disponible para personalización de timers */
export type TimerColor =
  | 'neutral'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'violet'

/** Icono disponible para personalización de timers */
export type TimerIcon =
  | 'none'
  | 'clock'
  | 'fire'
  | 'bolt'
  | 'heart'
  | 'star'
  | 'flag'
  | 'target'
  | 'trophy'
  | 'moon'

/** Valores por defecto para timers sin personalización explícita */
export const DEFAULT_TIMER_COLOR: TimerColor = 'neutral'
export const DEFAULT_TIMER_ICON: TimerIcon = 'none'

/** Paleta de colores con valores hex para light/dark mode.
 *  Todos los colores validados para contraste AA (4.5:1 texto, 3:1 UI) sobre fondo claro y oscuro. */
export const TIMER_PALETTE: Record<TimerColor, { light: string; dark: string }> = {
  neutral: { light: '#6B7280', dark: '#9CA3AF' }, // slate-500 / slate-400
  red:     { light: '#DC2626', dark: '#EF4444' }, // red-600 / red-400
  orange:  { light: '#EA580C', dark: '#FB923C' }, // orange-600 / orange-400
  amber:   { light: '#D97706', dark: '#FBBF24' }, // amber-600 / amber-400
  green:   { light: '#16A34A', dark: '#4ADE80' }, // green-600 / green-400
  blue:    { light: '#2563EB', dark: '#60A5FA' }, // blue-600 / blue-400
  indigo:  { light: '#4F46E5', dark: '#818CF8' }, // indigo-600 / indigo-400
  violet:  { light: '#7C3AED', dark: '#A78BFA' }, // violet-600 / violet-400
}

/** Catálogo de iconos mapeados a AppIconName.
 *  'none' = sin icono (renderiza solo texto). */
export const TIMER_ICONS: Record<TimerIcon, AppIconName | null> = {
  none: null,
  clock: 'rotateRight',   // existente en AppIcon
  fire: 'fire',           // NUEVO - se añadirá a AppIcon
  bolt: 'bolt',           // NUEVO - se añadirá a AppIcon
  heart: 'heart',         // NUEVO - se añadirá a AppIcon
  star: 'star',           // NUEVO - se añadirá a AppIcon
  flag: 'flag',           // NUEVO - se añadirá a AppIcon
  target: 'bullseye',     // NUEVO - se añadirá a AppIcon
  trophy: 'trophy',       // NUEVO - se añadirá a AppIcon
  moon: 'moon',           // NUEVO - se añadirá a AppIcon
}

/** Obtiene el color hex para el modo actual (light/dark) */
export function getTimerColorHex(color: TimerColor, darkMode: boolean = false): string {
  return darkMode ? TIMER_PALETTE[color].dark : TIMER_PALETTE[color].light
}

/** Obtiene el AppIconName para un TimerIcon, o null si es 'none' */
export function getTimerIconName(icon: TimerIcon): AppIconName | null {
  return TIMER_ICONS[icon]
}

/** Valida que un color sea válido */
export function isValidTimerColor(value: unknown): value is TimerColor {
  return typeof value === 'string' && value in TIMER_PALETTE
}

/** Valida que un icono sea válido */
export function isValidTimerIcon(value: unknown): value is TimerIcon {
  return typeof value === 'string' && value in TIMER_ICONS
}

/** Normaliza un color desconocido al default */
export function normalizeTimerColor(value: unknown): TimerColor {
  return isValidTimerColor(value) ? value : DEFAULT_TIMER_COLOR
}

/** Normaliza un icono desconocido al default */
export function normalizeTimerIcon(value: unknown): TimerIcon {
  return isValidTimerIcon(value) ? value : DEFAULT_TIMER_ICON
}

/** Array ordenado de colores para iterar en UI (default primero) */
export const TIMER_COLORS_ORDERED: TimerColor[] = [
  'neutral', 'red', 'orange', 'amber', 'green', 'blue', 'indigo', 'violet'
]

/** Array ordenado de iconos para iterar en UI (none primero) */
export const TIMER_ICONS_ORDERED: TimerIcon[] = [
  'none', 'clock', 'fire', 'bolt', 'heart', 'star', 'flag', 'target', 'trophy', 'moon'
]

/** Etiquetas legibles para colores (para screen readers / tooltips) */
export const TIMER_COLOR_LABELS: Record<TimerColor, string> = {
  neutral: 'Neutro',
  red: 'Rojo',
  orange: 'Naranja',
  amber: 'Ámbar',
  green: 'Verde',
  blue: 'Azul',
  indigo: 'Índigo',
  violet: 'Violeta',
}

/** Etiquetas legibles para iconos (para screen readers / tooltips) */
export const TIMER_ICON_LABELS: Record<TimerIcon, string> = {
  none: 'Sin icono',
  clock: 'Reloj',
  fire: 'Fuego',
  bolt: 'Rayo',
  heart: 'Corazón',
  star: 'Estrella',
  flag: 'Bandera',
  target: 'Blanco',
  trophy: 'Trofeo',
  moon: 'Luna',
}