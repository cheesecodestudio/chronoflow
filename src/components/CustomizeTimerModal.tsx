import { useState } from 'react'

import { AppIcon } from './AppIcon'
import { TimerCustomizationFields } from './TimerCustomizationFields'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { getEffectiveTimerCustomization } from '../features/timers/timer.customization'
import type { Timer, TimerCustomization } from '../features/timers/timer.types'

interface CustomizeTimerModalProps {
  timer: Timer
  onSubmit: (customization: Required<TimerCustomization>) => Promise<void>
  onClose: () => void
  returnFocusTo: HTMLButtonElement | null
}

export function CustomizeTimerModal({ timer, onSubmit, onClose, returnFocusTo }: CustomizeTimerModalProps) {
  const [customization, setCustomization] = useState<Required<TimerCustomization>>(
    () => getEffectiveTimerCustomization(timer),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(customization)
      onClose()
    } catch {
      setSubmitError('No se pudo guardar la personalización. Inténtalo nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog labelledBy="customize-timer-title" describedBy="customize-timer-description"
      onClose={onClose} returnFocusTo={returnFocusTo} dismissible={!isSubmitting}>
      <header className="cf-dialog-header">
        <div>
          <h2 id="customize-timer-title" className="cf-dialog-title">Personalizar “{timer.title}”</h2>
          <p id="customize-timer-description" className="cf-dialog-description">Elige un acento y un icono para reconocer tu timer.</p>
        </div>
        <Button variant="ghost" className="cf-button--icon" aria-label="Cerrar personalización"
          disabled={isSubmitting} onClick={onClose}>
          <AppIcon name="xmark" />
        </Button>
      </header>
      <TimerCustomizationFields value={customization} onChange={setCustomization} disabled={isSubmitting} />
      {submitError ? <p className="cf-error" role="alert">{submitError}</p> : null}
      <div className="cf-dialog-actions">
        <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>Cancelar</Button>
        <Button disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? 'Guardando...' : 'Guardar personalización'}
        </Button>
      </div>
    </Dialog>
  )
}
