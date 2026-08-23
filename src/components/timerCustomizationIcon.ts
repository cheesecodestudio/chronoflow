import type { AppIconName } from './AppIcon'
import type { TimerIcon } from '../features/timers/timer.types'

const TIMER_ICON_APP_NAMES: Record<TimerIcon, AppIconName> = {
  clock: 'clock',
  focus: 'focus',
  bolt: 'bolt',
  leaf: 'leaf',
  book: 'book',
  dumbbell: 'dumbbell',
}

export function getTimerAppIconName(icon: TimerIcon): AppIconName {
  return TIMER_ICON_APP_NAMES[icon]
}
