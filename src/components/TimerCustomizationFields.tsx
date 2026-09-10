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
    <div className="cf-customization">
      <fieldset disabled={disabled}>
        <legend>
          Color / acento
        </legend>
        <p className="cf-field-help">
          Un detalle de color para identificarlo.
        </p>
        <div className="cf-choices">
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
        <legend>
          Icono
        </legend>
        <div className="cf-choices">
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
    <label className="cf-choice">
      <input
        type="radio"
        name={name}
        value={accent}
        checked={checked}
        onChange={onChange}
        className="cf-sr-only"
      />
      <span>
        <span
          aria-hidden="true"
          className="cf-swatch"
          style={{ backgroundColor: color }}
        />
        <span className="cf-choice-label">{TIMER_ACCENT_LABELS[accent]}</span>
        {checked ? <AppIcon name="check" /> : null}
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
    <label className="cf-choice">
      <input
        type="radio"
        name={name}
        value={icon}
        checked={checked}
        onChange={onChange}
        className="cf-sr-only"
      />
      <span>
        <AppIcon
          name={getTimerAppIconName(icon)}
          style={{ color: TIMER_ACCENT_COLORS[accent] }}
        />
        <span className="cf-choice-label">{TIMER_ICON_LABELS[icon]}</span>
        {checked ? <AppIcon name="check" /> : null}
      </span>
    </label>
  )
}
