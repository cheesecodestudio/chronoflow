import { useId } from 'react'

import { AppIcon } from './AppIcon'
import { getTimerAppIconName } from './timerCustomizationIcon'
import {
  TIMER_ACCENT_COLORS,
  TIMER_ACCENT_LABELS,
  TIMER_ACCENTS,
  TIMER_ICON_LABELS,
  TIMER_ICONS,
} from '../features/timers/timer.customization'
import type {
  TimerAccent,
  TimerCustomization,
  TimerIcon,
} from '../features/timers/timer.types'

interface TimerCustomizationFieldsProps {
  value: Required<TimerCustomization>
  onChange: (value: Required<TimerCustomization>) => void
  disabled?: boolean
}

export function TimerCustomizationFields({
  value,
  onChange,
  disabled = false,
}: TimerCustomizationFieldsProps) {
  const groupId = useId()

  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Color / acento
        </legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          El acento identifica el timer; el contenido siempre conserva su contraste.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIMER_ACCENTS.map((accent) => (
            <AccentOption
              key={accent}
              accent={accent}
              checked={value.accent === accent}
              name={`${groupId}-accent`}
              onChange={() => onChange({ ...value, accent })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Icono
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIMER_ICONS.map((icon) => (
            <IconOption
              key={icon}
              icon={icon}
              checked={value.icon === icon}
              name={`${groupId}-icon`}
              accent={value.accent}
              onChange={() => onChange({ ...value, icon })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function AccentOption({
  accent,
  checked,
  name,
  onChange,
}: {
  accent: TimerAccent
  checked: boolean
  name: string
  onChange: () => void
}) {
  const color = TIMER_ACCENT_COLORS[accent]

  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name={name}
        value={accent}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#091522] px-3 text-sm text-slate-300 transition hover:border-white/25 peer-checked:border-white/40 peer-checked:bg-white/[0.07] peer-focus-visible:outline-2 peer-focus-visible:outline-cyan-200 peer-focus-visible:outline-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-60">
        <span
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full border border-white/25"
          style={{ backgroundColor: color }}
        />
        <span className="flex-1">{TIMER_ACCENT_LABELS[accent]}</span>
        {checked ? <AppIcon name="check" className="size-3" /> : null}
      </span>
    </label>
  )
}

function IconOption({
  icon,
  checked,
  name,
  accent,
  onChange,
}: {
  icon: TimerIcon
  checked: boolean
  name: string
  accent: TimerAccent
  onChange: () => void
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name={name}
        value={icon}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#091522] px-3 text-sm text-slate-300 transition hover:border-white/25 peer-checked:border-white/40 peer-checked:bg-white/[0.07] peer-focus-visible:outline-2 peer-focus-visible:outline-cyan-200 peer-focus-visible:outline-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-60">
        <AppIcon
          name={getTimerAppIconName(icon)}
          className="size-4 shrink-0"
          style={{ color: TIMER_ACCENT_COLORS[accent] }}
        />
        <span className="flex-1">{TIMER_ICON_LABELS[icon]}</span>
        {checked ? <AppIcon name="check" className="size-3" /> : null}
      </span>
    </label>
  )
}
