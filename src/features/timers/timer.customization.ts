import type { TimerAccent, TimerCustomization, TimerIcon } from './timer.types'

export const DEFAULT_TIMER_ACCENT: TimerAccent = 'blue'
export const DEFAULT_TIMER_ICON: TimerIcon = 'clock'

export const TIMER_ACCENTS: readonly TimerAccent[] = [
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'slate',
]

export const TIMER_ICONS: readonly TimerIcon[] = [
  'clock',
  'focus',
  'bolt',
  'leaf',
  'book',
  'dumbbell',
]

export const TIMER_ACCENT_LABELS: Record<TimerAccent, string> = {
  blue: 'Azul',
  green: 'Verde',
  amber: 'Ámbar',
  red: 'Rojo',
  purple: 'Morado',
  slate: 'Pizarra',
}

export const TIMER_ICON_LABELS: Record<TimerIcon, string> = {
  clock: 'Reloj',
  focus: 'Enfoque',
  bolt: 'Rayo',
  leaf: 'Hoja',
  book: 'Libro',
  dumbbell: 'Ejercicio',
}

export const TIMER_ACCENT_COLORS: Record<TimerAccent, string> = {
  blue: '#60a5fa',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
  purple: '#c084fc',
  slate: '#94a3b8',
}

export function isTimerAccent(value: unknown): value is TimerAccent {
  return typeof value === 'string' && TIMER_ACCENTS.includes(value as TimerAccent)
}

export function isTimerIcon(value: unknown): value is TimerIcon {
  return typeof value === 'string' && TIMER_ICONS.includes(value as TimerIcon)
}

export function getEffectiveTimerCustomization(
  customization: TimerCustomization,
): Required<TimerCustomization> {
  return {
    accent: isTimerAccent(customization.accent)
      ? customization.accent
      : DEFAULT_TIMER_ACCENT,
    icon: isTimerIcon(customization.icon)
      ? customization.icon
      : DEFAULT_TIMER_ICON,
  }
}

export function isValidTimerCustomization(
  customization: TimerCustomization,
): boolean {
  return (
    (customization.accent === undefined || isTimerAccent(customization.accent)) &&
    (customization.icon === undefined || isTimerIcon(customization.icon))
  )
}
